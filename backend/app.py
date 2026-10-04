import os
import platform
import hmac
import hashlib
import json
from sqlalchemy import text
from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, Student, Staff, Admin, LeaveRequest, BonafideRequest, GatepassRequest, PasswordReset, Message
import jwt
import datetime
from dotenv import load_dotenv
from functools import wraps

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_fallback_secret')

# Parse SERVICE_URI if available, otherwise use individual env vars
service_uri = os.getenv('SERVICE_URI', '')
if service_uri and 'mysql://' in service_uri:
    import re
    match = re.match(r'mysql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)', service_uri)
    if match:
        db_user = match.group(1)
        db_password = match.group(2)
        db_host = match.group(3)
        db_port = match.group(4)
        db_name = match.group(5)
    else:
        db_host = os.getenv('HOST', 'localhost')
        db_port = os.getenv('PORT', '3306')
        db_user = os.getenv('USER', 'root')
        db_password = os.getenv('PASSWORD', '')
        db_name = os.getenv('DATABASE_NAME', 'secflow')
else:
    db_host = os.getenv('HOST', 'localhost')
    db_port = os.getenv('PORT', '3306')
    db_user = os.getenv('USER', 'root')
    db_password = os.getenv('PASSWORD', '')
    db_name = os.getenv('DATABASE_NAME', 'secflow')

print(f"Connecting to database: {db_host}:{db_port}/{db_name}")

# Aiven MySQL is mandatory. If the connection fails, show the error
# and stop — never fall back to a local SQLite database.
try:
    # First connect without database to create it
    import pymysql
    connection = pymysql.connect(
        host=db_host,
        port=int(db_port),
        user=db_user,
        password=db_password
    )
    with connection.cursor() as cursor:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    connection.close()
    print(f"Database '{db_name}' created or already exists")

    # Now configure the main app with the database
    db_url = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url

    if 'aivencloud' in db_host or 'aivencloud.com' in db_host:
        if platform.system() == 'Windows':
            app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'connect_args': {'ssl_disabled': True}}
        else:
            app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'connect_args': {'ssl': {}}}

    print("Connected to MySQL successfully!")
except Exception as e:
    print(f"MySQL connection failed: {e}")
    raise RuntimeError(f"Cannot start without the Aiven MySQL database: {e}")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)


def _ensure_column(table, column, ddl):
    """Add a column if missing (create_all only creates new tables)."""
    try:
        db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
        db.session.commit()
        print(f"Added column {table}.{column}")
    except Exception as e:
        db.session.rollback()
        msg = str(e).lower()
        if 'duplicate' not in msg and 'already exists' not in msg:
            print(f"Column check {table}.{column}: {e}")

# Create tables and seed admin
with app.app_context():
    try:
        db.create_all()
        print("Tables created successfully")
    except Exception as e:
        print(f"Table creation warning: {e}")

    # Backfill columns for existing tables
    _ensure_column('gatepass_requests', 'verified_at', 'DATETIME NULL')
    _ensure_column('gatepass_requests', 'verified_by', 'VARCHAR(50) NULL')
    _ensure_column('gatepass_requests', 'scan_count', 'INTEGER DEFAULT 0')
    _ensure_column('bonafide_requests', 'study_level', 'VARCHAR(50) NULL')
    _ensure_column('bonafide_requests', 'student_category', 'VARCHAR(50) NULL')
    _ensure_column('bonafide_requests', 'college_type', 'VARCHAR(50) NULL')
    _ensure_column('bonafide_requests', 'address', 'TEXT NULL')
    _ensure_column('staff', 'year', 'VARCHAR(20) NULL')
    _ensure_column('messages', 'is_edited', 'TINYINT(1) DEFAULT 0')
    _ensure_column('messages', 'deleted_by_sender', 'TINYINT(1) DEFAULT 0')
    _ensure_column('messages', 'deleted_by_receiver', 'TINYINT(1) DEFAULT 0')
    
    # Create default admin if not exists
    admin = Admin.query.filter_by(admin_id='admin').first()
    if not admin:
        admin = Admin(
            admin_id='admin',
            name='Administrator'
        )
        admin.set_password('sengunthar')
        db.session.add(admin)
        db.session.commit()
        print("Default admin created.")
    else:
        print("Admin already exists.")


# ==================== AUTH HELPERS ====================

def token_required(f):
    """Verify JWT token and extract user"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        print(f"=== token_required: headers = {dict(request.headers)}")
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split()
            if len(parts) == 2 and parts[0] == 'Bearer':
                token = parts[1]
        
        print(f"=== token_required: token = {token[:20] if token else 'None'}...")
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            print(f"=== token_required: decoded data = {data}")
            # Try to find user in all tables
            student = Student.query.filter_by(roll_no=data.get('roll_no')).first()
            staff = Staff.query.filter_by(staff_id=data.get('staff_id')).first()
            admin = Admin.query.filter_by(admin_id=data.get('admin_id')).first()
            
            current_user = student or staff or admin
            print(f"=== token_required: current_user = {current_user}")
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except:
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(current_user, *args, **kwargs)
    return decorated


# ==================== ROLE DECORATOR DEBUG ====================

def role_required(*roles):
    """Decorator to check user has required role"""
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            user_role = None
            if isinstance(current_user, Student):
                user_role = 'student'
            elif isinstance(current_user, Staff):
                user_role = current_user.role  # 'staff' or 'hod'
            elif isinstance(current_user, Admin):
                user_role = 'admin'
            
            print(f"=== role_required: user_role={user_role}, required_roles={roles}")
            
            if user_role not in roles:
                return jsonify({'message': f'Access denied. Required roles: {roles}, got: {user_role}'}), 403
            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator


# ==================== AUTHENTICATION ====================

@app.route('/signup/', methods=['POST'])
def signup():
    """Student registration"""
    data = request.get_json()
    if not data or not data.get('roll_no') or not data.get('password'):
        return jsonify({'message': 'Missing data'}), 400

    if Student.query.filter_by(roll_no=data['roll_no']).first():
        return jsonify({'message': 'User already exists'}), 400

    new_student = Student(
        roll_no=data['roll_no'],
        name=data.get('name', ''),
        gender=data.get('gender', 'male'),
        department=data.get('department', ''),
        email=data.get('email', ''),
        phone=data.get('phone', ''),
        reg_no=data.get('reg_no', ''),
        academic_year=data.get('academic_year', '')
    )
    new_student.set_password(data['password'])
    db.session.add(new_student)
    db.session.commit()

    return jsonify({'message': 'Student created successfully', 'student': new_student.to_dict()}), 201


@app.route('/login/', methods=['POST'])
def login():
    """Login for all user types"""
    data = request.get_json()
    if not data or not data.get('roll_no') or not data.get('password'):
        return jsonify({'message': 'Could not verify'}), 400

    # Check admin
    admin = Admin.query.filter_by(admin_id=data['roll_no']).first()
    if admin and admin.check_password(data['password']):
        token = jwt.encode({
            'admin_id': admin.admin_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({
            'token': token,
            'role': 'admin',
            'name': admin.name,
            'gender': 'male',
            'department': 'Administration'
        }), 200

    # Check student
    student = Student.query.filter_by(roll_no=data['roll_no']).first()
    if student and student.check_password(data['password']):
        req_dept = (data.get('department') or '').strip()
        if req_dept and (student.department or '').strip().lower() != req_dept.lower():
            return jsonify({'message': 'Department does not match our records'}), 401
        token = jwt.encode({
            'roll_no': student.roll_no,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({
            'token': token,
            'role': 'student',
            'name': student.name,
            'gender': student.gender,
            'department': student.department
        }), 200

    # Check staff
    staff = Staff.query.filter_by(staff_id=data['roll_no']).first()
    if staff and staff.check_password(data['password']):
        token = jwt.encode({
            'staff_id': staff.staff_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({
            'token': token,
            'role': staff.role,
            'name': staff.name,
            'gender': staff.gender,
            'department': staff.department
        }), 200

    return jsonify({'message': 'Invalid credentials'}), 401


# ==================== STUDENT ROUTES ====================

@app.route('/student/info/', methods=['GET'])
@token_required
def student_info(current_user):
    """Get current student info"""
    if not isinstance(current_user, Student):
        return jsonify({'message': 'Access denied'}), 403
    
    return jsonify({
        'name': current_user.name,
        'roll_no': current_user.roll_no,
        'department': current_user.department,
        'gender': current_user.gender,
        'email': current_user.email,
        'phone': current_user.phone,
        'course': f"B.Sc. {current_user.department}",
        'academic_year': current_user.academic_year or 'Year 4'
    }), 200


@app.route('/staff/info/', methods=['GET'])
@token_required
def staff_info(current_user):
    """Get current staff/HOD profile"""
    if not isinstance(current_user, Staff):
        return jsonify({'message': 'Access denied'}), 403
    return jsonify(current_user.to_dict()), 200


@app.route('/staff/profile/', methods=['PUT'])
@token_required
@role_required('staff', 'hod')
def update_staff_profile(current_user):
    """Staff/HOD updates own profile. Role and staff ID are server-locked
    and can never be changed through this endpoint."""
    if not isinstance(current_user, Staff):
        return jsonify({'message': 'Access denied'}), 403

    data = request.get_json() or {}
    data.pop('role', None)
    data.pop('staff_id', None)

    for field in ('name', 'gender', 'department', 'email', 'phone', 'general_info', 'year'):
        if field in data and data[field] is not None:
            setattr(current_user, field, data[field])
    db.session.commit()

    return jsonify({
        'message': 'Profile updated successfully',
        'staff': current_user.to_dict()
    }), 200


@app.route('/staff/password/', methods=['PUT'])
@token_required
@role_required('staff', 'hod')
def change_staff_password(current_user):
    """Staff/HOD changes own password after verifying the current one."""
    if not isinstance(current_user, Staff):
        return jsonify({'message': 'Access denied'}), 403

    data = request.get_json() or {}
    current_password = data.get('current_password', '') or ''
    new_password = data.get('new_password', '') or ''

    if not current_user.check_password(current_password):
        return jsonify({'message': 'Current password is incorrect'}), 400
    if len(new_password) < 6:
        return jsonify({'message': 'New password must be at least 6 characters'}), 400

    current_user.set_password(new_password)
    db.session.commit()
    return jsonify({'message': 'Password changed successfully. Please login again.'}), 200


@app.route('/student/profile/', methods=['PUT'])
@token_required
@role_required('student')
def update_student_profile(current_user):
    """Student updates own profile. Roll number is server-locked
    and can never be changed through this endpoint."""
    if not isinstance(current_user, Student):
        return jsonify({'message': 'Access denied'}), 403

    data = request.get_json() or {}
    data.pop('roll_no', None)

    for field in ('name', 'gender', 'department', 'email', 'phone',
                  'reg_no', 'academic_year'):
        if field in data and data[field] is not None:
            setattr(current_user, field, data[field])
    db.session.commit()

    return jsonify({
        'message': 'Profile updated successfully',
        'student': current_user.to_dict()
    }), 200


# ==================== LEAVE REQUEST ROUTES ====================

@app.route('/leave/create/', methods=['POST'])
@token_required
@role_required('student')
def create_leave(current_user):
    """Student creates a leave request"""
    data = request.get_json()
    
    if not data.get('title') or not data.get('start_date') or not data.get('end_date'):
        return jsonify({'message': 'Title, start date and end date are required'}), 400
    
    new_leave = LeaveRequest(
        student_roll_no=current_user.roll_no,
        student_name=current_user.name,
        department=current_user.department,
        title=data.get('title', ''),
        description=data.get('description', ''),
        leave_type=data.get('leave_type', 'casual'),
        start_date=data.get('start_date', ''),
        end_date=data.get('end_date', ''),
        status='pending'
    )
    db.session.add(new_leave)
    db.session.commit()
    return jsonify({'message': 'Leave request created', 'request': new_leave.to_dict()}), 201


@app.route('/leave/my/', methods=['GET'])
@token_required
@role_required('student')
def my_leaves(current_user):
    """Student views their own leave requests"""
    leaves = LeaveRequest.query.filter_by(student_roll_no=current_user.roll_no).order_by(LeaveRequest.created_at.desc()).all()
    return jsonify([l.to_dict() for l in leaves]), 200


@app.route('/leave/staff-pending/', methods=['GET'])
@token_required
@role_required('staff', 'admin')
def staff_pending_leaves(current_user):
    """Staff views pending requests in their department"""
    if isinstance(current_user, Staff):
        leaves = LeaveRequest.query.filter_by(
            department=current_user.department, 
            status='pending'
        ).order_by(LeaveRequest.created_at.desc()).all()
    else:
        # Admin sees all pending
        leaves = LeaveRequest.query.filter_by(status='pending').order_by(LeaveRequest.created_at.desc()).all()
    
    return jsonify([l.to_dict() for l in leaves]), 200


@app.route('/leave/staff-approved/', methods=['GET'])
@token_required
@role_required('hod', 'admin')
def hod_pending_leaves(current_user):
    """HOD views staff-approved requests in their department"""
    print(f"=== HOD view - current_user: {current_user}, role: {current_user.role if hasattr(current_user, 'role') else 'N/A'}, department: {current_user.department}")
    
    if isinstance(current_user, Staff):  # HOD has role='hod' but is also Staff
        leaves = LeaveRequest.query.filter_by(
            department=current_user.department, 
            status='staff_approved'
        ).order_by(LeaveRequest.created_at.desc()).all()
    else:
        # Admin sees all
        leaves = LeaveRequest.query.filter_by(status='staff_approved').order_by(LeaveRequest.created_at.desc()).all()
    
    print(f"=== Found {len(leaves)} staff-approved leaves")
    return jsonify([l.to_dict() for l in leaves]), 200


@app.route('/leave/<int:id>/staff-approve/', methods=['POST'])
@token_required
@role_required('staff', 'admin')
def staff_approve_leave(current_user, id):
    """Staff approves a pending request"""
    leave = LeaveRequest.query.get_or_404(id)
    
    # Verify department match for staff
    if isinstance(current_user, Staff) and leave.department != current_user.department:
        return jsonify({'message': 'Unauthorized - different department'}), 403
    
    if leave.status != 'pending':
        return jsonify({'message': 'Request is not in pending status'}), 400
    
    data = request.get_json() or {}
    leave.status = 'staff_approved'
    leave.staff_remark = data.get('remark', '')
    leave.staff_id = current_user.staff_id if isinstance(current_user, Staff) else 'admin'
    db.session.commit()
    
    return jsonify({'message': 'Leave approved by staff', 'request': leave.to_dict()}), 200


@app.route('/leave/<int:id>/staff-reject/', methods=['POST'])
@token_required
@role_required('staff', 'admin')
def staff_reject_leave(current_user, id):
    """Staff rejects a pending request"""
    leave = LeaveRequest.query.get_or_404(id)
    
    if isinstance(current_user, Staff) and leave.department != current_user.department:
        return jsonify({'message': 'Unauthorized - different department'}), 403
    
    if leave.status != 'pending':
        return jsonify({'message': 'Request is not in pending status'}), 400
    
    data = request.get_json() or {}
    leave.status = 'staff_rejected'
    leave.staff_remark = data.get('remark', '')
    leave.staff_id = current_user.staff_id if isinstance(current_user, Staff) else 'admin'
    db.session.commit()
    
    return jsonify({'message': 'Leave rejected by staff', 'request': leave.to_dict()}), 200


@app.route('/leave/<int:id>/hod-approve/', methods=['POST'])
@token_required
@role_required('hod', 'admin')
def hod_approve_leave(current_user, id):
    """HOD gives final approval"""
    leave = LeaveRequest.query.get_or_404(id)
    
    if isinstance(current_user, Staff) and leave.department != current_user.department:
        return jsonify({'message': 'Unauthorized - different department'}), 403
    
    if leave.status != 'staff_approved':
        return jsonify({'message': 'Request is not approved by staff yet'}), 400
    
    data = request.get_json() or {}
    leave.status = 'hod_approved'
    leave.hod_remark = data.get('remark', '')
    leave.hod_id = current_user.staff_id if isinstance(current_user, Staff) else 'admin'
    db.session.commit()
    
    return jsonify({'message': 'Leave approved by HOD', 'request': leave.to_dict()}), 200


@app.route('/leave/<int:id>/hod-reject/', methods=['POST'])
@token_required
@role_required('hod', 'admin')
def hod_reject_leave(current_user, id):
    """HOD gives final rejection"""
    leave = LeaveRequest.query.get_or_404(id)
    
    if isinstance(current_user, Staff) and leave.department != current_user.department:
        return jsonify({'message': 'Unauthorized - different department'}), 403
    
    if leave.status != 'staff_approved':
        return jsonify({'message': 'Request is not approved by staff yet'}), 400
    
    data = request.get_json() or {}
    leave.status = 'hod_rejected'
    leave.hod_remark = data.get('remark', '')
    leave.hod_id = current_user.staff_id if isinstance(current_user, Staff) else 'admin'
    db.session.commit()
    
    return jsonify({'message': 'Leave rejected by HOD', 'request': leave.to_dict()}), 200


# ==================== BONAFIDE REQUEST ROUTES ====================

@app.route('/bonafide/create/', methods=['POST'])
@token_required
@role_required('student')
def create_bonafide(current_user):
    """Student creates a bonafide request"""
    data = request.get_json()
    
    if not data.get('title') or not data.get('purpose'):
        return jsonify({'message': 'Title and purpose are required'}), 400
    
    new_bonafide = BonafideRequest(
        student_roll_no=current_user.roll_no,
        student_name=current_user.name,
        department=current_user.department,
        title=data.get('title', ''),
        description=data.get('description', ''),
        purpose=data.get('purpose', ''),
        certificate_type=data.get('certificate_type', 'bonafide'),
        study_level=data.get('study_level', ''),
        student_category=data.get('student_category', ''),
        college_type=data.get('college_type', ''),
        address=data.get('address', ''),
        status='pending'
    )
    db.session.add(new_bonafide)
    db.session.commit()
    return jsonify({'message': 'Bonafide request created', 'request': new_bonafide.to_dict()}), 201


@app.route('/bonafide/my/', methods=['GET'])
@token_required
@role_required('student')
def my_bonafides(current_user):
    """Student views their own bonafide requests"""
    bonafides = BonafideRequest.query.filter_by(student_roll_no=current_user.roll_no).order_by(BonafideRequest.created_at.desc()).all()
    return jsonify([b.to_dict() for b in bonafides]), 200


@app.route('/bonafide/staff-pending/', methods=['GET'])
@token_required
@role_required('staff', 'admin')
def staff_pending_bonafides(current_user):
    """Staff views pending bonafide requests"""
    if isinstance(current_user, Staff):
        bonafides = BonafideRequest.query.filter_by(
            department=current_user.department, 
            status='pending'
        ).order_by(BonafideRequest.created_at.desc()).all()
    else:
        bonafides = BonafideRequest.query.filter_by(status='pending').order_by(BonafideRequest.created_at.desc()).all()
    
    return jsonify([b.to_dict() for b in bonafides]), 200


@app.route('/bonafide/staff-approved/', methods=['GET'])
@token_required
@role_required('hod', 'admin')
def hod_pending_bonafides(current_user):
    """HOD views staff-approved bonafide requests"""
    if isinstance(current_user, Staff):
        bonafides = BonafideRequest.query.filter_by(
            department=current_user.department, 
            status='staff_approved'
        ).order_by(BonafideRequest.created_at.desc()).all()
    else:
        bonafides = BonafideRequest.query.filter_by(status='staff_approved').order_by(BonafideRequest.created_at.desc()).all()
    
    return jsonify([b.to_dict() for b in bonafides]), 200


@app.route('/bonafide/<int:id>/staff-approve/', methods=['POST'])
@token_required
@role_required('staff', 'admin')
def staff_approve_bonafide(current_user, id):
    """Staff approves a bonafide request"""
    bonafide = BonafideRequest.query.get_or_404(id)
    
    if isinstance(current_user, Staff) and bonafide.department != current_user.department:
        return jsonify({'message': 'Unauthorized'}), 403
    
    if bonafide.status != 'pending':
        return jsonify({'message': 'Request is not in pending status'}), 400
    
    data = request.get_json() or {}
    bonafide.status = 'staff_approved'
    bonafide.staff_remark = data.get('remark', '')
    bonafide.staff_id = current_user.staff_id if isinstance(current_user, Staff) else 'admin'
    db.session.commit()
    
    return jsonify({'message': 'Bonafide approved by staff', 'request': bonafide.to_dict()}), 200


@app.route('/bonafide/<int:id>/staff-reject/', methods=['POST'])
@token_required
@role_required('staff', 'admin')
def staff_reject_bonafide(current_user, id):
    """Staff rejects a bonafide request"""
    bonafide = BonafideRequest.query.get_or_404(id)
    
    if isinstance(current_user, Staff) and bonafide.department != current_user.department:
        return jsonify({'message': 'Unauthorized'}), 403
    
    if bonafide.status != 'pending':
        return jsonify({'message': 'Request is not in pending status'}), 400
    
    data = request.get_json() or {}
    bonafide.status = 'staff_rejected'
    bonafide.staff_remark = data.get('remark', '')
    bonafide.staff_id = current_user.staff_id if isinstance(current_user, Staff) else 'admin'
    db.session.commit()
    
    return jsonify({'message': 'Bonafide rejected by staff', 'request': bonafide.to_dict()}), 200


@app.route('/bonafide/<int:id>/hod-approve/', methods=['POST'])
@token_required
@role_required('hod', 'admin')
def hod_approve_bonafide(current_user, id):
    """HOD gives final approval"""
    bonafide = BonafideRequest.query.get_or_404(id)
    
    if isinstance(current_user, Staff) and bonafide.department != current_user.department:
        return jsonify({'message': 'Unauthorized'}), 403
    
    if bonafide.status != 'staff_approved':
        return jsonify({'message': 'Request is not approved by staff yet'}), 400
    
    data = request.get_json() or {}
    bonafide.status = 'hod_approved'
    bonafide.hod_remark = data.get('remark', '')
    bonafide.hod_id = current_user.staff_id if isinstance(current_user, Staff) else 'admin'
    db.session.commit()
    
    return jsonify({'message': 'Bonafide approved by HOD', 'request': bonafide.to_dict()}), 200


@app.route('/bonafide/<int:id>/hod-reject/', methods=['POST'])
@token_required
@role_required('hod', 'admin')
def hod_reject_bonafide(current_user, id):
    """HOD gives final rejection"""
    bonafide = BonafideRequest.query.get_or_404(id)
    
    if isinstance(current_user, Staff) and bonafide.department != current_user.department:
        return jsonify({'message': 'Unauthorized'}), 403
    
    if bonafide.status != 'staff_approved':
        return jsonify({'message': 'Request is not approved by staff yet'}), 400
    
    data = request.get_json() or {}
    bonafide.status = 'hod_rejected'
    bonafide.hod_remark = data.get('remark', '')
    bonafide.hod_id = current_user.staff_id if isinstance(current_user, Staff) else 'admin'
    db.session.commit()
    
    return jsonify({'message': 'Bonafide rejected by HOD', 'request': bonafide.to_dict()}), 200


# ==================== GATEPASS REQUEST ROUTES ====================

@app.route('/gatepass/create/', methods=['POST'])
@token_required
@role_required('student')
def create_gatepass(current_user):
    """Student creates a gatepass request"""
    data = request.get_json()
    
    if not data.get('title') or not data.get('visit_date') or not data.get('out_time'):
        return jsonify({'message': 'Title, visit date and out time are required'}), 400
    
    new_gatepass = GatepassRequest(
        student_roll_no=current_user.roll_no,
        student_name=current_user.name,
        department=current_user.department,
        title=data.get('title', ''),
        description=data.get('description', ''),
        reason=data.get('reason', ''),
        visit_place=data.get('visit_place', ''),
        visit_date=data.get('visit_date', ''),
        out_time=data.get('out_time', ''),
        status='pending'
    )
    new_gatepass.generate_pass_id()
    db.session.add(new_gatepass)
    db.session.commit()
    return jsonify({'message': 'Gatepass request created', 'request': new_gatepass.to_dict()}), 201


@app.route('/gatepass/my/', methods=['GET'])
@token_required
@role_required('student')
def my_gatepasses(current_user):
    """Student views their own gatepass requests"""
    gatepasses = GatepassRequest.query.filter_by(student_roll_no=current_user.roll_no).order_by(GatepassRequest.created_at.desc()).all()
    return jsonify([g.to_dict() for g in gatepasses]), 200


@app.route('/gatepass/staff-pending/', methods=['GET'])
@token_required
@role_required('staff', 'admin')
def staff_pending_gatepasses(current_user):
    """Staff views pending gatepass requests"""
    if isinstance(current_user, Staff):
        gatepasses = GatepassRequest.query.filter_by(
            department=current_user.department, 
            status='pending'
        ).order_by(GatepassRequest.created_at.desc()).all()
    else:
        gatepasses = GatepassRequest.query.filter_by(status='pending').order_by(GatepassRequest.created_at.desc()).all()
    
    return jsonify([g.to_dict() for g in gatepasses]), 200


@app.route('/gatepass/staff-approved/', methods=['GET'])
@token_required
@role_required('hod', 'admin')
def hod_pending_gatepasses(current_user):
    """HOD views staff-approved gatepass requests"""
    if isinstance(current_user, Staff):
        gatepasses = GatepassRequest.query.filter_by(
            department=current_user.department, 
            status='staff_approved'
        ).order_by(GatepassRequest.created_at.desc()).all()
    else:
        gatepasses = GatepassRequest.query.filter_by(status='staff_approved').order_by(GatepassRequest.created_at.desc()).all()
    
    return jsonify([g.to_dict() for g in gatepasses]), 200


@app.route('/gatepass/<int:id>/staff-approve/', methods=['POST'])
@token_required
@role_required('staff', 'admin')
def staff_approve_gatepass(current_user, id):
    """Staff approves a gatepass request"""
    gatepass = GatepassRequest.query.get_or_404(id)
    
    if isinstance(current_user, Staff) and gatepass.department != current_user.department:
        return jsonify({'message': 'Unauthorized'}), 403
    
    if gatepass.status != 'pending':
        return jsonify({'message': 'Request is not in pending status'}), 400
    
    data = request.get_json() or {}
    gatepass.status = 'staff_approved'
    gatepass.staff_remark = data.get('remark', '')
    gatepass.staff_id = current_user.staff_id if isinstance(current_user, Staff) else 'admin'
    db.session.commit()
    
    return jsonify({'message': 'Gatepass approved by staff', 'request': gatepass.to_dict()}), 200


@app.route('/gatepass/<int:id>/staff-reject/', methods=['POST'])
@token_required
@role_required('staff', 'admin')
def staff_reject_gatepass(current_user, id):
    """Staff rejects a gatepass request"""
    gatepass = GatepassRequest.query.get_or_404(id)
    
    if isinstance(current_user, Staff) and gatepass.department != current_user.department:
        return jsonify({'message': 'Unauthorized'}), 403
    
    if gatepass.status != 'pending':
        return jsonify({'message': 'Request is not in pending status'}), 400
    
    data = request.get_json() or {}
    gatepass.status = 'staff_rejected'
    gatepass.staff_remark = data.get('remark', '')
    gatepass.staff_id = current_user.staff_id if isinstance(current_user, Staff) else 'admin'
    db.session.commit()
    
    return jsonify({'message': 'Gatepass rejected by staff', 'request': gatepass.to_dict()}), 200


@app.route('/gatepass/<int:id>/hod-approve/', methods=['POST'])
@token_required
@role_required('hod', 'admin')
def hod_approve_gatepass(current_user, id):
    """HOD gives final approval"""
    gatepass = GatepassRequest.query.get_or_404(id)
    
    if isinstance(current_user, Staff) and gatepass.department != current_user.department:
        return jsonify({'message': 'Unauthorized'}), 403
    
    if gatepass.status != 'staff_approved':
        return jsonify({'message': 'Request is not approved by staff yet'}), 400
    
    data = request.get_json() or {}
    gatepass.status = 'hod_approved'
    gatepass.hod_remark = data.get('remark', '')
    gatepass.hod_id = current_user.staff_id if isinstance(current_user, Staff) else 'admin'
    db.session.commit()
    
    return jsonify({'message': 'Gatepass approved by HOD', 'request': gatepass.to_dict()}), 200


@app.route('/gatepass/<int:id>/hod-reject/', methods=['POST'])
@token_required
@role_required('hod', 'admin')
def hod_reject_gatepass(current_user, id):
    """HOD gives final rejection"""
    gatepass = GatepassRequest.query.get_or_404(id)
    
    if isinstance(current_user, Staff) and gatepass.department != current_user.department:
        return jsonify({'message': 'Unauthorized'}), 403
    
    if gatepass.status != 'staff_approved':
        return jsonify({'message': 'Request is not approved by staff yet'}), 400
    
    data = request.get_json() or {}
    gatepass.status = 'hod_rejected'
    gatepass.hod_remark = data.get('remark', '')
    gatepass.hod_id = current_user.staff_id if isinstance(current_user, Staff) else 'admin'
    db.session.commit()
    
    return jsonify({'message': 'Gatepass rejected by HOD', 'request': gatepass.to_dict()}), 200


# ==================== ADMIN ROUTES ====================

@app.route('/admin/create-staff/', methods=['POST'])
@token_required
@role_required('admin')
def create_staff(current_user):
    """Admin creates a staff member"""
    data = request.get_json()
    print(f"=== Creating staff with data: {data}")
    new_staff = Staff(
        staff_id=data.get('staff_id'),
        name=data.get('name', ''),
        gender=data.get('gender', 'male'),
        department=data.get('department', ''),
        email=data.get('email', ''),
        phone=data.get('phone', ''),
        role='staff',
        general_info=data.get('general_info', ''),
        year=data.get('year', '')
    )
    new_staff.set_password(data.get('password', 'password'))
    db.session.add(new_staff)
    db.session.commit()
    print(f"=== Staff created: {new_staff.to_dict()}")
    return jsonify({'message': 'Staff created', 'staff': new_staff.to_dict()}), 201


@app.route('/admin/create-hod/', methods=['POST'])
@token_required
@role_required('admin')
def create_hod(current_user):
    """Admin creates an HOD"""
    data = request.get_json()
    print(f"=== Creating HOD with data: {data}")
    new_hod = Staff(
        staff_id=data.get('staff_id'),
        name=data.get('name', ''),
        gender=data.get('gender', 'male'),
        department=data.get('department', ''),
        email=data.get('email', ''),
        phone=data.get('phone', ''),
        role='hod',
        general_info=data.get('general_info', '')
    )
    new_hod.set_password(data.get('password', 'password'))
    db.session.add(new_hod)
    db.session.commit()
    print(f"=== HOD created: {new_hod.to_dict()}")
    return jsonify({'message': 'HOD created', 'staff': new_hod.to_dict()}), 201


@app.route('/admin/students/', methods=['GET'])
@token_required
@role_required('admin')
def get_all_students(current_user):
    """Admin views all students"""
    students = Student.query.all()
    return jsonify([s.to_dict() for s in students]), 200


@app.route('/admin/staff/', methods=['GET'])
@token_required
@role_required('admin')
def get_all_staff(current_user):
    """Admin views all staff"""
    staff = Staff.query.all()
    return jsonify([s.to_dict() for s in staff]), 200


@app.route('/admin/clear-all-data/', methods=['POST'])
@token_required
@role_required('admin')
def clear_all_data(current_user):
    """Clear all request data - removes all rows but keeps table structure"""
    try:
        # Delete all request data
        db.session.query(LeaveRequest).delete()
        db.session.query(BonafideRequest).delete()
        db.session.query(GatepassRequest).delete()

        # Delete all chats and password-reset sessions
        db.session.query(Message).delete()
        db.session.query(PasswordReset).delete()
        
        # Delete all staff (except admin)
        db.session.query(Staff).delete()
        
        # Delete all students
        db.session.query(Student).delete()
        
        db.session.commit()
        return jsonify({'message': 'All data cleared successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500


# ==================== GATEPASS QR VERIFICATION ====================

def _expected_qr_sig(gatepass_id, pass_id):
    body = f"{gatepass_id}:{pass_id or ''}"
    return hmac.new(
        app.config['SECRET_KEY'].encode(), body.encode(), hashlib.sha256
    ).hexdigest()


@app.route('/gatepass/verify-qr/', methods=['POST'])
@token_required
@role_required('staff', 'hod', 'admin')
def verify_gatepass_qr(current_user):
    """Staff/HOD scans a gatepass QR. Returns validity + student details,
    and records the verification time in the database."""
    data = request.get_json() or {}
    raw = data.get('payload', '')

    try:
        payload = json.loads(raw) if isinstance(raw, str) else raw
        gid = int(payload.get('id'))
        pass_id = payload.get('pass', '')
        sig = payload.get('sig', '')
        if not hmac.compare_digest(_expected_qr_sig(gid, pass_id), sig):
            raise ValueError('bad signature')
    except Exception:
        return jsonify({'valid': False, 'reason': 'Invalid QR code. This pass is not genuine.'}), 200

    gatepass = GatepassRequest.query.get(gid)
    if not gatepass or gatepass.pass_id != pass_id:
        return jsonify({'valid': False, 'reason': 'Pass ID not found in records.'}), 200

    if gatepass.status != 'hod_approved':
        return jsonify({
            'valid': False,
            'reason': f'Pass is not approved yet (status: {gatepass.status}).'
        }), 200

    # Record verification time + scanner
    now = datetime.datetime.utcnow()
    first_scan = gatepass.verified_at is None
    if first_scan:
        gatepass.verified_at = now
        gatepass.verified_by = (
            current_user.staff_id if isinstance(current_user, Staff) else 'admin'
        )
    gatepass.scan_count = (gatepass.scan_count or 0) + 1
    db.session.commit()

    result = gatepass.to_dict()
    result['first_scan'] = first_scan
    return jsonify({'valid': True, 'gatepass': result}), 200


# ==================== MESSAGES ====================

def _identity(user):
    """Return (type, id) for any authenticated user."""
    if isinstance(user, Student):
        return ('student', user.roll_no)
    if isinstance(user, Staff):
        return ('staff', user.staff_id)
    return ('admin', user.admin_id)


def _person_info(p_type, p_id):
    """Public profile for a message counterpart."""
    if p_type == 'student':
        s = Student.query.filter_by(roll_no=p_id).first()
        if s:
            return {'id': s.roll_no, 'type': 'student', 'name': s.name,
                    'meta': f"{s.academic_year or ''} • {s.department}".strip(' •'),
                    'department': s.department, 'year': s.academic_year or ''}
    elif p_type == 'staff':
        s = Staff.query.filter_by(staff_id=p_id).first()
        if s:
            return {'id': s.staff_id, 'type': 'staff', 'name': s.name,
                    'meta': f"{s.role.upper()} • {s.department}",
                    'department': s.department, 'role': s.role, 'year': s.year or ''}
    else:
        a = Admin.query.filter_by(admin_id=p_id).first()
        if a:
            return {'id': a.admin_id, 'type': 'admin', 'name': a.name,
                    'meta': 'Administrator', 'department': '', 'role': 'admin'}
    return {'id': p_id, 'type': p_type, 'name': p_id, 'meta': ''}


@app.route('/messages/directory/', methods=['GET'])
@token_required
def message_directory(current_user):
    """Who the current user is allowed to message.

    Staff only see students of their own department AND year
    (e.g. a Year 3 staff sees Year 3 students). HODs see all
    students of their department. Students see department staff
    whose year is unset or matches their own academic year.
    """
    me_type, _ = _identity(current_user)

    if me_type == 'student':
        dept = current_user.department or ''
        year = current_user.academic_year or ''
        people = []
        for s in Staff.query.filter_by(department=dept).order_by(Staff.name).all():
            if s.year and year and s.year != year:
                continue
            people.append(_person_info('staff', s.staff_id))
        return jsonify(people), 200

    query = Student.query
    if me_type == 'staff':
        query = query.filter_by(department=current_user.department or '')
        if current_user.year:
            query = query.filter_by(academic_year=current_user.year)
    elif me_type == 'hod':
        query = query.filter_by(department=current_user.department or '')
    students = query.order_by(Student.name).all()
    return jsonify([_person_info('student', s.roll_no) for s in students]), 200


@app.route('/messages/conversations/', methods=['GET'])
@token_required
def message_conversations(current_user):
    """Recent chats with last message + unread count."""
    me_type, me_id = _identity(current_user)
    msgs = Message.query.filter(
        _visible_messages(me_type, me_id)
    ).order_by(Message.created_at.desc()).all()

    convos = {}
    for m in msgs:
        if m.sender_type == me_type and m.sender_id == me_id:
            key = (m.receiver_type, m.receiver_id)
            mine = True
        else:
            key = (m.sender_type, m.sender_id)
            mine = False
        if key not in convos:
            convos[key] = {'person': _person_info(*key), 'last_message': m.to_dict(),
                           'unread': 0}
        if not mine and not m.is_read:
            convos[key]['unread'] += 1

    return jsonify({'me': {'type': me_type, 'id': me_id},
                    'conversations': list(convos.values())}), 200


@app.route('/messages/with/<ctype>/<cid>/', methods=['GET'])
@token_required
def message_thread(current_user, ctype, cid):
    """Full thread with one counterpart (marks their messages read)."""
    me_type, me_id = _identity(current_user)
    if ctype not in ('student', 'staff', 'admin'):
        return jsonify({'message': 'Invalid user type'}), 400

    msgs = Message.query.filter(
        _visible_messages(me_type, me_id) &
        ((((Message.sender_type == me_type) & (Message.sender_id == me_id)) &
           ((Message.receiver_type == ctype) & (Message.receiver_id == cid))) |
         (((Message.sender_type == ctype) & (Message.sender_id == cid)) &
           ((Message.receiver_type == me_type) & (Message.receiver_id == me_id))))
    ).order_by(Message.created_at.asc()).all()

    for m in msgs:
        if m.receiver_type == me_type and m.receiver_id == me_id and not m.is_read:
            m.is_read = True
    db.session.commit()

    return jsonify({'me': {'type': me_type, 'id': me_id},
                    'person': _person_info(ctype, cid),
                    'messages': [m.to_dict() for m in msgs]}), 200


@app.route('/messages/send/', methods=['POST'])
@token_required
def message_send(current_user):
    """Send a message to another user."""
    me_type, me_id = _identity(current_user)
    data = request.get_json() or {}
    ctype = data.get('receiver_type', '')
    cid = (data.get('receiver_id', '') or '').strip()
    body = (data.get('body', '') or '').strip()

    if ctype not in ('student', 'staff', 'admin') or not cid:
        return jsonify({'message': 'Invalid receiver'}), 400
    if not body:
        return jsonify({'message': 'Message cannot be empty'}), 400
    if len(body) > 1000:
        return jsonify({'message': 'Message too long (max 1000 characters)'}), 400
    if ctype == 'student' and not Student.query.filter_by(roll_no=cid).first():
        return jsonify({'message': 'Receiver not found'}), 404
    if ctype == 'staff' and not Staff.query.filter_by(staff_id=cid).first():
        return jsonify({'message': 'Receiver not found'}), 404
    if ctype == 'admin' and not Admin.query.filter_by(admin_id=cid).first():
        return jsonify({'message': 'Receiver not found'}), 404

    msg = Message(sender_type=me_type, sender_id=me_id,
                  receiver_type=ctype, receiver_id=cid, body=body)
    db.session.add(msg)
    db.session.commit()
    return jsonify({'message': 'Sent', 'data': msg.to_dict()}), 201


def _visible_messages(me_type, me_id):
    """Messages not deleted by the current user's side."""
    sent = ((Message.sender_type == me_type) & (Message.sender_id == me_id) &
            (Message.deleted_by_sender == False))
    received = ((Message.receiver_type == me_type) & (Message.receiver_id == me_id) &
                (Message.deleted_by_receiver == False))
    return sent | received


@app.route('/messages/<int:mid>/', methods=['PUT'])
@token_required
def message_edit(current_user, mid):
    """Edit own message text (marks it edited)."""
    me_type, me_id = _identity(current_user)
    msg = Message.query.get_or_404(mid)
    if msg.sender_type != me_type or msg.sender_id != me_id:
        return jsonify({'message': 'Only the sender can edit this message'}), 403

    data = request.get_json() or {}
    body = (data.get('body', '') or '').strip()
    if not body:
        return jsonify({'message': 'Message cannot be empty'}), 400
    if len(body) > 1000:
        return jsonify({'message': 'Message too long (max 1000 characters)'}), 400

    msg.body = body
    msg.is_edited = True
    db.session.commit()
    return jsonify({'message': 'Edited', 'data': msg.to_dict()}), 200


@app.route('/messages/<int:mid>/', methods=['DELETE'])
@token_required
def message_delete(current_user, mid):
    """Delete for me (?mode=me, default) or for everyone (?mode=everyone, sender only)."""
    me_type, me_id = _identity(current_user)
    msg = Message.query.get_or_404(mid)
    is_sender = msg.sender_type == me_type and msg.sender_id == me_id
    is_receiver = msg.receiver_type == me_type and msg.receiver_id == me_id
    if not is_sender and not is_receiver:
        return jsonify({'message': 'Access denied'}), 403

    mode = (request.args.get('mode') or 'me').lower()
    if mode == 'everyone':
        if not is_sender:
            return jsonify({'message': 'Only the sender can delete for everyone'}), 403
        db.session.delete(msg)
        db.session.commit()
        return jsonify({'message': 'Deleted for everyone'}), 200

    if is_sender:
        msg.deleted_by_sender = True
    else:
        msg.deleted_by_receiver = True
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200


@app.route('/messages/with/<ctype>/<cid>/', methods=['DELETE'])
@token_required
def message_clear(current_user, ctype, cid):
    """Delete the entire conversation with one counterpart."""
    me_type, me_id = _identity(current_user)
    if ctype not in ('student', 'staff', 'admin'):
        return jsonify({'message': 'Invalid user type'}), 400

    msgs = Message.query.filter(
        (((Message.sender_type == me_type) & (Message.sender_id == me_id)) &
         ((Message.receiver_type == ctype) & (Message.receiver_id == cid))) |
        (((Message.sender_type == ctype) & (Message.sender_id == cid)) &
         ((Message.receiver_type == me_type) & (Message.receiver_id == me_id)))
    ).all()
    for m in msgs:
        db.session.delete(m)
    db.session.commit()
    return jsonify({'message': 'Chat cleared', 'deleted': len(msgs)}), 200


# Legacy route for backward compatibility
@app.route('/request/my/', methods=['GET'])
@token_required
def my_requests(current_user):
    if isinstance(current_user, Student):
        leaves = LeaveRequest.query.filter_by(student_roll_no=current_user.roll_no).all()
        bonafides = BonafideRequest.query.filter_by(student_roll_no=current_user.roll_no).all()
        gatepasses = GatepassRequest.query.filter_by(student_roll_no=current_user.roll_no).all()
        
        all_requests = []
        for l in leaves:
            l.request_type = 'leave'
            all_requests.append(l)
        for b in bonafides:
            b.request_type = 'bonafide'
            all_requests.append(b)
        for g in gatepasses:
            g.request_type = 'gatepass'
            all_requests.append(g)
        
        all_requests.sort(key=lambda x: x.created_at, reverse=True)
        return jsonify([r.to_dict() for r in all_requests[:10]]), 200
    
    return jsonify([]), 200


# ==================== PASSWORD RESET (OTP via Email) ====================

import secrets
import smtplib
from email.message import EmailMessage

OTP_EXPIRY_MINUTES = 10
RESET_TOKEN_EXPIRY_MINUTES = 15
MAX_OTP_ATTEMPTS = 5

import hashlib


def _hash_otp(otp):
    pepper = app.config.get('SECRET_KEY', '')
    return hashlib.sha256(f"{otp}{pepper}".encode()).hexdigest()


def _mask_email(email):
    if not email or '@' not in email:
        return 'your registered email'
    name, domain = email.split('@', 1)
    masked = name[0] + '***' if len(name) <= 2 else name[0] + '***' + name[-1]
    return f'{masked}@{domain}'


def _send_otp_email(to_email, otp, name):
    """Send OTP via SMTP. Returns True if sent, False if mail not configured."""
    server = os.getenv('MAIL_SERVER', '')
    username = os.getenv('MAIL_USERNAME', '')
    # App passwords are often pasted with spaces; Gmail requires them stripped
    password = os.getenv('MAIL_PASSWORD', '').replace(' ', '')
    if not server or not username or not password:
        return False
    port = int(os.getenv('MAIL_PORT', '587'))
    sender = os.getenv('MAIL_FROM', username)
    msg = EmailMessage()
    msg['Subject'] = 'SEC Flow - Password Reset OTP'
    msg['From'] = sender
    msg['To'] = to_email
    msg.set_content(
        f"Hi {name},\n\nYour SEC Flow password reset OTP is: {otp}\n\n"
        f"It expires in {OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.\n\n"
        f"- SEC Flow"
    )
    with smtplib.SMTP(server, port, timeout=15) as smtp:
        smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(msg)
    return True


@app.route('/password-reset/request/', methods=['POST'])
def password_reset_request():
    """Student enters ID -> find email in DB -> send OTP."""
    data = request.get_json() or {}
    roll_no = (data.get('roll_no') or '').strip()
    if not roll_no:
        return jsonify({'message': 'Student ID is required'}), 400

    student = Student.query.filter_by(roll_no=roll_no).first()
    staff = None
    if not student:
        staff = Staff.query.filter_by(staff_id=roll_no).first()
    if not student and not staff:
        return jsonify({'message': 'No account found for this ID'}), 404
    account = student or staff
    if not account.email:
        return jsonify({'message': 'No email registered for this account. Contact your department office.'}), 400

    otp = f"{secrets.randbelow(900000) + 100000}"
    print(f"Password reset requested for roll_no={roll_no}")
    entry = PasswordReset.query.filter_by(roll_no=roll_no).first()
    if not entry:
        entry = PasswordReset(roll_no=roll_no)
        db.session.add(entry)
    entry.otp_hash = _hash_otp(otp)
    entry.exp = datetime.datetime.utcnow() + datetime.timedelta(minutes=OTP_EXPIRY_MINUTES)
    entry.attempts = 0
    entry.verified = False
    entry.reset_token = None
    entry.token_exp = None
    db.session.commit()

    try:
        sent = _send_otp_email(account.email, otp, account.name)
    except Exception as e:
        print(f"OTP email failed: {e}")
        sent = False

    response = {'message': f'OTP sent to {_mask_email(account.email)}'}
    if not sent:
        # Dev fallback: SMTP not configured, expose OTP for testing
        print(f"[DEV] OTP for {roll_no}: {otp}")
        response['dev_otp'] = otp
    return jsonify(response), 200


@app.route('/password-reset/verify/', methods=['POST'])
def password_reset_verify():
    """Student enters OTP -> get one-time reset token."""
    data = request.get_json() or {}
    roll_no = (data.get('roll_no') or '').strip()
    otp = (data.get('otp') or '').strip()
    entry = PasswordReset.query.filter_by(roll_no=roll_no).first()
    if not entry:
        print(f"OTP verify failed for roll_no={roll_no}: no request row")
        return jsonify({'message': 'No OTP request found. Please request a new OTP.'}), 400
    if datetime.datetime.utcnow() > entry.exp:
        db.session.delete(entry)
        db.session.commit()
        return jsonify({'message': 'OTP expired. Please request a new one.'}), 400
    if entry.attempts >= MAX_OTP_ATTEMPTS:
        db.session.delete(entry)
        db.session.commit()
        return jsonify({'message': 'Too many wrong attempts. Please request a new OTP.'}), 429
    if _hash_otp(otp) != entry.otp_hash:
        entry.attempts += 1
        db.session.commit()
        left = MAX_OTP_ATTEMPTS - entry.attempts
        print(f"OTP verify failed for roll_no={roll_no}: wrong OTP, {left} left")
        return jsonify({'message': f'Incorrect OTP. {left} attempt(s) left.'}), 400

    token = secrets.token_urlsafe(32)
    entry.verified = True
    entry.reset_token = token
    entry.token_exp = datetime.datetime.utcnow() + datetime.timedelta(minutes=RESET_TOKEN_EXPIRY_MINUTES)
    db.session.commit()
    print(f"OTP verified for roll_no={roll_no}")
    return jsonify({'message': 'OTP verified', 'reset_token': token}), 200


@app.route('/password-reset/confirm/', methods=['POST'])
def password_reset_confirm():
    """Set new password using a verified reset token (single use)."""
    data = request.get_json() or {}
    token = data.get('reset_token', '')
    new_password = data.get('new_password', '') or ''
    entry = PasswordReset.query.filter_by(reset_token=token).first() if token else None
    if not entry or not entry.verified or datetime.datetime.utcnow() > entry.token_exp:
        if entry:
            db.session.delete(entry)
            db.session.commit()
        return jsonify({'message': 'Reset session expired. Please start over.'}), 400
    if len(new_password) < 6:
        return jsonify({'message': 'Password must be at least 6 characters'}), 400

    student = Student.query.filter_by(roll_no=entry.roll_no).first()
    account = student or Staff.query.filter_by(staff_id=entry.roll_no).first()
    if not account:
        return jsonify({'message': 'Account not found'}), 404
    account.set_password(new_password)
    db.session.delete(entry)
    db.session.commit()
    return jsonify({'message': 'Password reset successfully. Please login.'}), 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)