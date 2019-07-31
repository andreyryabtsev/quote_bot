CREATE USER IF NOT EXISTS 'bot'@'localhost';
GRANT ALL PRIVILEGES ON *.* TO 'bot'@'localhost';
CREATE DATABASE IF NOT EXISTS bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bot;
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discord_id VARCHAR(20) NOT NULL,
    permissions INT NOT NULL DEFAULT 0,
    nickname TEXT,
    signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (discord_id)
);
CREATE TABLE IF NOT EXISTS logs(
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY fk_cat(user_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS quotes(
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    FOREIGN KEY fk_cat(user_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS votes(
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    discord_channel_id TEXT,
    discord_message_id TEXT NOT NULL,
    options JSON NOT NULL,
    created_at TEXT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY fk_cat(user_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS cfg_terminal_tokens(
    id INT AUTO_INCREMENT PRIMARY KEY,
    type INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reminders(
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoked_on TEXT NOT NULL,
    delay_seconds INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    FOREIGN KEY fk_cat(user_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);
