import json
import logging
from datetime import datetime
from flask import render_template, request, jsonify, session, redirect, url_for

from app import app, db
from models import User, Quiz, Question, Option, QuizAttempt, GovernanceTopic, GovernanceOption, GovernanceVote
from hathor_client import HathorClient

hathor_client = HathorClient()

@app.route('/')
def index():
    """Main entry point for the Telegram Mini App"""
    # Get available quiz topics
    topics = db.session.query(Quiz.topic).distinct().all()
    topics = [topic[0] for topic in topics]
    
    # Get active governance topics
    governance_topics = GovernanceTopic.query.filter_by(status='active').all()
    
    return render_template('index.html', topics=topics, governance_topics=governance_topics)

@app.route('/api/init_user', methods=['POST'])
def init_user():
    """Initialize user from Telegram data"""
    data = request.json
    
    if not data or not data.get('telegram_id'):
        return jsonify({'error': 'Missing telegram_id'}), 400
    
    # Get or create user
    user = User.query.filter_by(telegram_id=data['telegram_id']).first()
    
    if not user:
        user = User(
            telegram_id=data['telegram_id'],
            username=data.get('username', ''),
            hathor_address=data.get('hathor_address', '')
        )
        db.session.add(user)
        db.session.commit()
    
    # Store user_id in session
    session['user_id'] = user.id
    
    return jsonify({
        'success': True,
        'user_id': user.id,
        'token_balance': user.token_balance
    })

@app.route('/quizzes/<topic>')
def get_quizzes_by_topic(topic):
    """Get all quizzes for a specific topic"""
    quizzes = Quiz.query.filter_by(topic=topic).all()
    return render_template('quiz.html', quizzes=quizzes, topic=topic)

@app.route('/quiz/<int:quiz_id>')
def get_quiz(quiz_id):
    """Get a specific quiz and its questions"""
    quiz = Quiz.query.get_or_404(quiz_id)
    questions = Question.query.filter_by(quiz_id=quiz_id).all()
    
    return render_template('quiz.html', quiz=quiz, questions=questions)

@app.route('/api/quiz/<int:quiz_id>')
def get_quiz_data(quiz_id):
    """Get quiz data for API"""
    quiz = Quiz.query.get_or_404(quiz_id)
    questions = Question.query.filter_by(quiz_id=quiz_id).all()
    
    quiz_data = {
        'id': quiz.id,
        'title': quiz.title,
        'description': quiz.description,
        'topic': quiz.topic,
        'difficulty': quiz.difficulty,
        'reward_tokens': quiz.reward_tokens,
        'questions': []
    }
    
    for question in questions:
        options = Option.query.filter_by(question_id=question.id).all()
        question_data = {
            'id': question.id,
            'text': question.text,
            'options': [{'id': option.id, 'text': option.text} for option in options]
        }
        quiz_data['questions'].append(question_data)
    
    return jsonify(quiz_data)

@app.route('/api/submit_quiz', methods=['POST'])
def submit_quiz():
    """Submit a quiz and calculate score"""
    if 'user_id' not in session:
        return jsonify({'error': 'User not authenticated'}), 401
    
    data = request.json
    user_id = session['user_id']
    quiz_id = data.get('quiz_id')
    answers = data.get('answers', {})
    
    if not quiz_id or not answers:
        return jsonify({'error': 'Missing quiz_id or answers'}), 400
    
    # Calculate score
    quiz = Quiz.query.get_or_404(quiz_id)
    questions = Question.query.filter_by(quiz_id=quiz_id).all()
    
    total_questions = len(questions)
    correct_answers = 0
    
    for question in questions:
        question_id = str(question.id)
        if question_id in answers:
            selected_option_id = answers[question_id]
            correct_option = Option.query.filter_by(question_id=question.id, is_correct=True).first()
            
            if correct_option and str(correct_option.id) == str(selected_option_id):
                correct_answers += 1
    
    score = correct_answers / total_questions if total_questions > 0 else 0
    
    # Record the attempt
    attempt = QuizAttempt(
        user_id=user_id,
        quiz_id=quiz_id,
        score=score,
        completed=True,
        completed_at=datetime.utcnow()
    )
    db.session.add(attempt)
    db.session.commit()
    
    # Check if reward should be sent
    reward_sent = False
    transaction_id = None
    rewards_amount = 0
    
    if score >= quiz.min_score_for_reward:
        user = User.query.get(user_id)
        if user and user.hathor_address:
            # Calculate reward amount based on score
            rewards_amount = quiz.reward_tokens * score
            
            # Send tokens via Hathor
            try:
                transaction_id = hathor_client.send_tokens(
                    destination_address=user.hathor_address,
                    amount=rewards_amount
                )
                
                if transaction_id:
                    # Update attempt with reward info
                    attempt.rewards_paid = True
                    attempt.rewards_amount = rewards_amount
                    attempt.transaction_id = transaction_id
                    
                    # Update user token balance
                    user.token_balance += rewards_amount
                    
                    db.session.commit()
                    reward_sent = True
            except Exception as e:
                logging.error(f"Error sending tokens: {str(e)}")
    
    return jsonify({
        'success': True,
        'score': score,
        'total_questions': total_questions,
        'correct_answers': correct_answers,
        'reward_sent': reward_sent,
        'rewards_amount': rewards_amount,
        'transaction_id': transaction_id
    })

@app.route('/results/<int:attempt_id>')
def quiz_results(attempt_id):
    """Show quiz results"""
    attempt = QuizAttempt.query.get_or_404(attempt_id)
    quiz = Quiz.query.get(attempt.quiz_id)
    
    return render_template('results.html', attempt=attempt, quiz=quiz)

@app.route('/wallet')
def wallet():
    """Show user wallet and token balance"""
    if 'user_id' not in session:
        return redirect(url_for('index'))
    
    user_id = session['user_id']
    user = User.query.get_or_404(user_id)
    
    # Get transaction history from attempts
    transactions = QuizAttempt.query.filter_by(
        user_id=user_id, 
        rewards_paid=True
    ).order_by(QuizAttempt.completed_at.desc()).all()
    
    return render_template('wallet.html', user=user, transactions=transactions)

@app.route('/api/update_wallet', methods=['POST'])
def update_wallet():
    """Update user's Hathor wallet address"""
    if 'user_id' not in session:
        return jsonify({'error': 'User not authenticated'}), 401
    
    data = request.json
    user_id = session['user_id']
    hathor_address = data.get('hathor_address')
    
    if not hathor_address:
        return jsonify({'error': 'Missing hathor_address'}), 400
    
    user = User.query.get_or_404(user_id)
    user.hathor_address = hathor_address
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/governance')
def governance():
    """Show governance topics for voting"""
    active_topics = GovernanceTopic.query.filter_by(status='active').all()
    past_topics = GovernanceTopic.query.filter_by(status='ended').all()
    
    return render_template('governance.html', active_topics=active_topics, past_topics=past_topics)

@app.route('/api/vote', methods=['POST'])
def submit_vote():
    """Submit a vote for a governance topic"""
    if 'user_id' not in session:
        return jsonify({'error': 'User not authenticated'}), 401
    
    data = request.json
    user_id = session['user_id']
    topic_id = data.get('topic_id')
    option_id = data.get('option_id')
    
    if not topic_id or not option_id:
        return jsonify({'error': 'Missing topic_id or option_id'}), 400
    
    # Check if user already voted
    existing_vote = GovernanceVote.query.filter_by(
        user_id=user_id,
        topic_id=topic_id
    ).first()
    
    user = User.query.get_or_404(user_id)
    
    # Voting power based on token balance (minimum 1)
    voting_power = max(1.0, user.token_balance)
    
    if existing_vote:
        # Update existing vote
        existing_vote.option_id = option_id
        existing_vote.voting_power = voting_power
    else:
        # Create new vote
        vote = GovernanceVote(
            user_id=user_id,
            topic_id=topic_id,
            option_id=option_id,
            voting_power=voting_power
        )
        db.session.add(vote)
    
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/governance/<int:topic_id>')
def get_governance_results(topic_id):
    """Get governance voting results"""
    topic = GovernanceTopic.query.get_or_404(topic_id)
    options = GovernanceOption.query.filter_by(topic_id=topic_id).all()
    
    results = []
    
    for option in options:
        votes = GovernanceVote.query.filter_by(option_id=option.id).all()
        total_power = sum(vote.voting_power for vote in votes)
        vote_count = len(votes)
        
        results.append({
            'option_id': option.id,
            'text': option.text,
            'vote_count': vote_count,
            'voting_power': total_power
        })
    
    return jsonify({
        'topic': {
            'id': topic.id,
            'title': topic.title,
            'description': topic.description,
            'status': topic.status
        },
        'results': results
    })

# Initialize some quiz data if the database is empty
def initialize_data():
    # Only add data if no quizzes exist
    if Quiz.query.count() == 0:
        # Create Web3 quiz
        web3_quiz = Quiz(
            title="Web3 Fundamentals",
            description="Test your knowledge of Web3 basics",
            topic="Blockchain",
            difficulty="Beginner",
            reward_tokens=5.0
        )
        db.session.add(web3_quiz)
        db.session.flush()  # To get the ID
        
        # Add questions
        q1 = Question(quiz_id=web3_quiz.id, text="What does Web3 primarily focus on?")
        db.session.add(q1)
        db.session.flush()
        
        db.session.add_all([
            Option(question_id=q1.id, text="Decentralization and blockchain technology", is_correct=True),
            Option(question_id=q1.id, text="Improved HTML rendering"),
            Option(question_id=q1.id, text="Faster internet speeds"),
            Option(question_id=q1.id, text="Cloud computing")
        ])
        
        q2 = Question(quiz_id=web3_quiz.id, text="What is a blockchain?")
        db.session.add(q2)
        db.session.flush()
        
        db.session.add_all([
            Option(question_id=q2.id, text="A distributed ledger technology", is_correct=True),
            Option(question_id=q2.id, text="A type of cryptocurrency"),
            Option(question_id=q2.id, text="A programming language"),
            Option(question_id=q2.id, text="A cloud storage solution")
        ])
        
        # Create Hathor quiz
        hathor_quiz = Quiz(
            title="Hathor Network Basics",
            description="Learn about Hathor's unique blockchain architecture",
            topic="Hathor",
            difficulty="Intermediate",
            reward_tokens=10.0
        )
        db.session.add(hathor_quiz)
        db.session.flush()
        
        # Add questions
        q3 = Question(quiz_id=hathor_quiz.id, text="What consensus mechanism does Hathor use?")
        db.session.add(q3)
        db.session.flush()
        
        db.session.add_all([
            Option(question_id=q3.id, text="Proof-of-Work and Proof-of-Stake hybrid", is_correct=True),
            Option(question_id=q3.id, text="Proof-of-Authority"),
            Option(question_id=q3.id, text="Delegated Proof-of-Stake"),
            Option(question_id=q3.id, text="Pure Proof-of-Work")
        ])
        
        # Create governance topic
        topic = GovernanceTopic(
            title="Next Quiz Topic",
            description="Vote on the next quiz topic to be added",
            status="active",
            end_date=datetime.utcnow().replace(day=datetime.utcnow().day + 7)  # 7 days from now
        )
        db.session.add(topic)
        db.session.flush()
        
        # Add governance options
        db.session.add_all([
            GovernanceOption(topic_id=topic.id, text="DeFi Fundamentals", description="Learn about decentralized finance protocols and use cases"),
            GovernanceOption(topic_id=topic.id, text="NFT Technology", description="Explore non-fungible tokens and their applications"),
            GovernanceOption(topic_id=topic.id, text="DAO Governance", description="Learn about decentralized autonomous organizations")
        ])
        
        db.session.commit()
