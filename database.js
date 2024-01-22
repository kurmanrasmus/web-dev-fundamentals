const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("kurman-database.db")


db.run(
`CREATE TABLE IF NOT EXISTS blog (
    blogId INTEGER PRIMARY KEY AUTOINCREMENT,
    blogTitle TEXT,
    blogContent TEXT
  )`);
  
db.run(
`CREATE TABLE IF NOT EXISTS faq (
    faqId INTEGER PRIMARY KEY AUTOINCREMENT,
    faqTitle TEXT,
    faqContent TEXT
  )`);
  
db.run(
`CREATE TABLE IF NOT EXISTS project (
    projectId INTEGER PRIMARY KEY AUTOINCREMENT,
    projectTitle TEXT,
    projectContent TEXT,
    projectLink TEXT
  )`);

  module.exports = db;