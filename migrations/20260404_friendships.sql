CREATE TABLE IF NOT EXISTS friendships (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_one_id INT UNSIGNED NOT NULL,
    user_two_id INT UNSIGNED NOT NULL,
    requested_by_user_id INT UNSIGNED NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'cancelled', 'removed') NOT NULL DEFAULT 'pending',
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_friendships_pair UNIQUE (user_one_id, user_two_id),
    CONSTRAINT fk_friendships_user_one FOREIGN KEY (user_one_id) REFERENCES portal_users (id),
    CONSTRAINT fk_friendships_user_two FOREIGN KEY (user_two_id) REFERENCES portal_users (id),
    CONSTRAINT fk_friendships_requested_by FOREIGN KEY (requested_by_user_id) REFERENCES portal_users (id),
    INDEX idx_friendships_status_active (status, active),
    INDEX idx_friendships_requested_by (requested_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;