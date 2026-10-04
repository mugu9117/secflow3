from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import uuid
import os
import hmac
import hashlib
import json

db = SQLAlchemy()

# ==================== USER TABLES ====================

class Student(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    roll_no = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    department = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    reg_no = db.Column(db.String(50), nullable=True)
    academic_year = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'roll_no': self.roll_no,
            'name': self.name,
            'gender': self.gender,
            'department': self.department,
            'email': self.email,
            'phone': self.phone,
            'reg_no': self.reg_no,
            'academic_year': self.academic_year,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Staff(db.Model):
    __tablename__ = 'staff'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    staff_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    department = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='staff')  # staff, hod
    general_info = db.Column(db.Text, nullable=True)
    year = db.Column(db.String(20), nullable=True)  # staff handling year (Year 1-4)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'staff_id': self.staff_id,
            'name': self.name,
            'gender': self.gender,
            'department': self.department,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'general_info': self.general_info,
            'year': self.year,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Admin(db.Model):
    __tablename__ = 'admins'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    admin_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'admin_id': self.admin_id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# ==================== REQUEST TABLES ====================

def _student_year(roll_no):
    """Academic year of a student ('' if unknown)."""
    try:
        s = Student.query.filter_by(roll_no=roll_no).first()
        return (s.academic_year or '') if s else ''
    except Exception:
        return ''


def _staff_name(staff_id):
    """Name of a staff/HOD approver ('' if unknown)."""
    try:
        if not staff_id:
            return ''
        s = Staff.query.filter_by(staff_id=staff_id).first()
        return s.name if s else staff_id
    except Exception:
        return ''


class LeaveRequest(db.Model):
    __tablename__ = 'leave_requests'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_roll_no = db.Column(db.String(50), nullable=False)
    student_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50), nullable=False)
    
    # Request details
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    leave_type = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.String(20), nullable=False)
    end_date = db.Column(db.String(20), nullable=False)
    
    # Status workflow: pending -> staff_approved/staff_rejected -> hod_approved/hod_rejected
    status = db.Column(db.String(30), default='pending')
    
    # Approval tracking
    staff_remark = db.Column(db.Text, nullable=True)
    staff_id = db.Column(db.String(50), nullable=True)
    hod_remark = db.Column(db.Text, nullable=True)
    hod_id = db.Column(db.String(50), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_roll_no': self.student_roll_no,
            'student_name': self.student_name,
            'department': self.department,
            'title': self.title,
            'description': self.description,
            'leave_type': self.leave_type,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'student_year': _student_year(self.student_roll_no),
            'hod_name': _staff_name(self.hod_id),
            'staff_name': _staff_name(self.staff_id),
            'status': self.status,
            'staff_remark': self.staff_remark,
            'staff_id': self.staff_id,
            'hod_remark': self.hod_remark,
            'hod_id': self.hod_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class BonafideRequest(db.Model):
    __tablename__ = 'bonafide_requests'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_roll_no = db.Column(db.String(50), nullable=False)
    student_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50), nullable=False)
    
    # Request details
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    purpose = db.Column(db.Text, nullable=False)
    certificate_type = db.Column(db.String(50), nullable=False)
    study_level = db.Column(db.String(50), nullable=True)
    student_category = db.Column(db.String(50), nullable=True)
    college_type = db.Column(db.String(50), nullable=True)
    address = db.Column(db.Text, nullable=True)
    
    # Status workflow: pending -> staff_approved/staff_rejected -> hod_approved/hod_rejected
    status = db.Column(db.String(30), default='pending')
    
    # Approval tracking
    staff_remark = db.Column(db.Text, nullable=True)
    staff_id = db.Column(db.String(50), nullable=True)
    hod_remark = db.Column(db.Text, nullable=True)
    hod_id = db.Column(db.String(50), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_roll_no': self.student_roll_no,
            'student_name': self.student_name,
            'department': self.department,
            'title': self.title,
            'description': self.description,
            'purpose': self.purpose,
            'certificate_type': self.certificate_type,
            'student_year': _student_year(self.student_roll_no),
            'hod_name': _staff_name(self.hod_id),
            'staff_name': _staff_name(self.staff_id),
            'study_level': self.study_level,
            'student_category': self.student_category,
            'college_type': self.college_type,
            'address': self.address,
            'status': self.status,
            'staff_remark': self.staff_remark,
            'staff_id': self.staff_id,
            'hod_remark': self.hod_remark,
            'hod_id': self.hod_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class GatepassRequest(db.Model):
    __tablename__ = 'gatepass_requests'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_roll_no = db.Column(db.String(50), nullable=False)
    student_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50), nullable=False)
    
    # Request details
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    reason = db.Column(db.Text, nullable=False)
    visit_place = db.Column(db.String(100), nullable=True)
    visit_date = db.Column(db.String(20), nullable=False)
    out_time = db.Column(db.String(20), nullable=False)
    in_time = db.Column(db.String(20), nullable=True)
    pass_id = db.Column(db.String(50), nullable=True)
    # Gate verification tracking
    verified_at = db.Column(db.DateTime, nullable=True)
    verified_by = db.Column(db.String(50), nullable=True)
    scan_count = db.Column(db.Integer, default=0)
    
    # Status workflow: pending -> staff_approved/staff_rejected -> hod_approved/hod_rejected
    status = db.Column(db.String(30), default='pending')
    
    # Approval tracking
    staff_remark = db.Column(db.Text, nullable=True)
    staff_id = db.Column(db.String(50), nullable=True)
    hod_remark = db.Column(db.Text, nullable=True)
    hod_id = db.Column(db.String(50), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def generate_pass_id(self):
        self.pass_id = f"PASS-{uuid.uuid4().hex[:6].upper()}"

    def qr_payload(self):
        """Signed QR content. Verifiable without storing any secret client-side."""
        secret = os.getenv('SECRET_KEY', 'default_fallback_secret')
        body = f"{self.id}:{self.pass_id or ''}"
        sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        return json.dumps({'v': 1, 'id': self.id, 'pass': self.pass_id, 'sig': sig})

    def to_dict(self):
        return {
            'id': self.id,
            'student_roll_no': self.student_roll_no,
            'student_name': self.student_name,
            'department': self.department,
            'title': self.title,
            'description': self.description,
            'reason': self.reason,
            'visit_place': self.visit_place,
            'visit_date': self.visit_date,
            'out_time': self.out_time,
            'in_time': self.in_time,
            'pass_id': self.pass_id,
            'student_year': _student_year(self.student_roll_no),
            'hod_name': _staff_name(self.hod_id),
            'staff_name': _staff_name(self.staff_id),
            'status': self.status,
            'staff_remark': self.staff_remark,
            'staff_id': self.staff_id,
            'hod_remark': self.hod_remark,
            'hod_id': self.hod_id,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'verified_by': self.verified_by,
            'scan_count': self.scan_count or 0,
            'qr_payload': self.qr_payload(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# Keep old User and Request for backward compatibility
User = Student
Request = LeaveRequest


class PasswordReset(db.Model):
    """One active OTP reset request per student (survives server restarts)."""
    __tablename__ = 'password_resets'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    roll_no = db.Column(db.String(50), unique=True, nullable=False)
    otp_hash = db.Column(db.String(128), nullable=False)
    exp = db.Column(db.DateTime, nullable=False)
    attempts = db.Column(db.Integer, default=0)
    verified = db.Column(db.Boolean, default=False)
    reset_token = db.Column(db.String(64), unique=True, nullable=True)
    token_exp = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Message(db.Model):
    """Direct message between any two users (student / staff / admin)."""
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sender_type = db.Column(db.String(10), nullable=False)
    sender_id = db.Column(db.String(50), nullable=False)
    receiver_type = db.Column(db.String(10), nullable=False)
    receiver_id = db.Column(db.String(50), nullable=False)
    body = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    is_edited = db.Column(db.Boolean, default=False, nullable=False)
    deleted_by_sender = db.Column(db.Boolean, default=False, nullable=False)
    deleted_by_receiver = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'sender_type': self.sender_type,
            'sender_id': self.sender_id,
            'receiver_type': self.receiver_type,
            'receiver_id': self.receiver_id,
            'body': self.body,
            'is_read': self.is_read,
            'is_edited': self.is_edited,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }