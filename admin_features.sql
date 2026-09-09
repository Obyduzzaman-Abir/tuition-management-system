USE tuition_management;

-- Add the ability to suspend an account (didn't exist in the original ERD)
ALTER TABLE Users ADD COLUMN status ENUM('active','suspended') DEFAULT 'active';

-- The actual system log: records every admin action, who did it, and when
CREATE TABLE System_Log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_user_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_type ENUM('user','tutor','post','feedback') NOT NULL,
    target_id INT NOT NULL,
    notes TEXT,
    action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);