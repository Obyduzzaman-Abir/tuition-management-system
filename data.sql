USE tuition_management;

INSERT INTO Users (name, email, phone, password_hash, role) VALUES
('Nabila Rahim', 'nabila@example.com', '01711000001', 'pass123', 'Student'),
('Tanvir Ahmed', 'tanvir@example.com', '01711000002', 'pass123', 'Student'),
('Samira Begum', 'samira@example.com', '01711000003', 'pass123', 'Student'),
('Sabbir Hossain', 'sabbir@example.com', '01811000001', 'pass123', 'Tutor'),
('Nusrat Jahan', 'nusrat@example.com', '01811000002', 'pass123', 'Tutor'),
('Imran Kabir', 'imran@example.com', '01811000003', 'pass123', 'Tutor'),
('System Admin', 'admin@tms.com', '01911000000', 'admin123', 'Admin');

INSERT INTO Student (user_id, address, date_of_birth, guardian_name) VALUES
(1, 'Mirpur, Dhaka', '2012-05-10', 'Rahim Uddin'),
(2, 'Dhanmondi, Dhaka', '2010-03-15', 'Karim Ahmed'),
(3, 'Uttara, Dhaka', '2014-07-22', 'Fatema Begum');

INSERT INTO Tutor (user_id, bio, experience, hourly_rate, is_verified) VALUES
(4, 'BSc in Mathematics, Dhaka University', 3, 500.00, TRUE),
(5, 'BSc in Physics, BUET', 5, 700.00, TRUE),
(6, 'BA in English, Dhaka University', 2, 400.00, FALSE);

INSERT INTO Subject (name, description) VALUES
('Mathematics', 'Algebra, geometry, calculus'),
('Physics', 'Mechanics, optics, electricity'),
('English', 'Grammar, literature, writing'),
('Chemistry', 'Organic and inorganic chemistry'),
('ICT', 'Basic computing and programming');

INSERT INTO Tuition_Post (student_id, title, description, budget, status) VALUES
(1, 'Need Math tutor for Class 8', 'Looking for evening classes, 5 days a week.', 5000.00, 'Closed'),
(2, 'Physics & Math tutor needed', 'Weekend sessions preferred.', 8000.00, 'Closed'),
(3, 'English tutor for Class 6', 'Evening classes, 3 days a week.', 4000.00, 'Open');

INSERT INTO Tuition_Subject (post_id, subject_id) VALUES
(1, 1),
(2, 2), (2, 1),
(3, 3);

INSERT INTO Tutor_Subject (tutor_id, subject_id, proficiency_level) VALUES
(1, 1, 'Expert'), (1, 4, 'Intermediate'),
(2, 2, 'Expert'), (2, 1, 'Intermediate'),
(3, 3, 'Expert'), (3, 5, 'Beginner');

INSERT INTO Tutor_Application (post_id, tutor_id, message, proposed_rate, status) VALUES
(1, 1, 'I can teach Math well, available evenings.', 500.00, 'Accepted'),
(2, 2, 'Experienced physics and math tutor.', 700.00, 'Accepted'),
(3, 3, 'Available evenings, 3 days a week.', 400.00, 'Pending');

INSERT INTO Selection (post_id, tutor_id) VALUES
(1, 1),
(2, 2);

INSERT INTO Schedule (selection_id, start_datetime, end_datetime, location, notes) VALUES
(1, '2026-09-07 18:00:00', '2026-09-07 19:30:00', 'Mirpur, Dhaka', 'Regular weekday class'),
(1, '2026-09-09 18:00:00', '2026-09-09 19:30:00', 'Mirpur, Dhaka', 'Regular weekday class'),
(2, '2026-09-06 10:00:00', '2026-09-06 12:00:00', 'Dhanmondi, Dhaka', 'Weekend session');

INSERT INTO Payment (schedule_id, amount, method, transaction_ref, status, paid_at) VALUES
(1, 2500.00, 'bKash', 'TXN1001', 'Completed', '2026-09-07 20:00:00'),
(3, 8000.00, 'Bank Transfer', NULL, 'Pending', NULL);

INSERT INTO Feedback (schedule_id, student_id, tutor_id, rating, comment) VALUES
(1, 1, 1, 5, 'Very punctual and explains well.'),
(3, 2, 2, 4, 'Good tutor, occasionally late.');

INSERT INTO Notification (user_id, message, is_read) VALUES
(1, 'Your tutor has been selected!', TRUE),
(4, 'You have a new application status update.', FALSE);

INSERT INTO Conversation (student_id, tutor_id) VALUES
(1, 1),
(2, 2);

INSERT INTO Message (conversation_id, sender_id, message) VALUES
(1, 1, 'Hi, when can we start classes?'),
(1, 4, 'We can start this Sunday evening.'),
(2, 2, 'Looking forward to the first class.');

INSERT INTO Attachment (message_id, file_url, file_type) VALUES
(2, 'https://example.com/files/syllabus.pdf', 'pdf');