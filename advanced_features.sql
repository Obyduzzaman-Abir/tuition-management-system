USE tuition_management;

-- VIEW: pre-built summary of each tutor's performance
CREATE VIEW Tutor_Performance AS
SELECT 
    u.name AS tutor_name,
    t.tutor_id,
    COUNT(DISTINCT f.feedback_id) AS total_reviews,
    ROUND(AVG(f.rating), 2) AS avg_rating,
    COALESCE(SUM(CASE WHEN p.status = 'Completed' THEN p.amount ELSE 0 END), 0) AS total_earned
FROM Tutor t
JOIN Users u ON t.user_id = u.user_id
LEFT JOIN Feedback f ON f.tutor_id = t.tutor_id
LEFT JOIN Selection sel ON sel.tutor_id = t.tutor_id
LEFT JOIN Schedule sc ON sc.selection_id = sel.selection_id
LEFT JOIN Payment p ON p.schedule_id = sc.schedule_id
GROUP BY u.name, t.tutor_id;

-- STORED PROCEDURE (with a TRANSACTION inside it): select a tutor for a post
DELIMITER $$
CREATE PROCEDURE SelectTutorForPost(IN p_post_id INT, IN p_tutor_id INT)
BEGIN
    START TRANSACTION;
    INSERT INTO Selection (post_id, tutor_id) VALUES (p_post_id, p_tutor_id);
    UPDATE Tuition_Post SET status = 'Closed' WHERE post_id = p_post_id;
    UPDATE Tutor_Application SET status = 'Accepted' WHERE post_id = p_post_id AND tutor_id = p_tutor_id;
    UPDATE Tutor_Application SET status = 'Rejected' WHERE post_id = p_post_id AND tutor_id != p_tutor_id;
    COMMIT;
END$$
DELIMITER ;

-- TRIGGER: auto-update Conversation.last_message_at whenever a new Message arrives
DELIMITER $$
CREATE TRIGGER trg_update_last_message
AFTER INSERT ON Message
FOR EACH ROW
BEGIN
    UPDATE Conversation
    SET last_message_at = NEW.sent_at
    WHERE conversation_id = NEW.conversation_id;
END$$
DELIMITER ;