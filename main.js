const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require ('express-session');
const bcrypt = require("bcrypt");
const db = require('./database.js');
const connectSqlite3 = require ('connect-sqlite3');
const app = express();
const SQLiteStore = connectSqlite3(session);
const PORT = process.env.PORT || 3000;

const minContentLength = 6;
const correctUsername = "Rasmus";
const correctHashedPassword = "$2b$12$qP2a6l2ka2uX6rZwK0JGBepj8OiwiinOWABVeH7.m20kmKcouE31i";

function obtainValidationErrorsForFaq(title, content, id) {
  const errors = [];

  if (title.length == 0) {
    errors.push("Title can not be empty");
  }
  if (content.length == 0) {
    errors.push("Content can not be empty");
  }
  if (content.length <= minContentLength) {
    errors.push("Content need more than " + minContentLength + " characters");
  }
  return errors;
}

function obtainValidationErrorsForProjects(title, content, link, id) {
  const errors = [];

  if (title.length == 0) {
    errors.push("Title can not be empty");
  }
  if (content.length == 0) {
    errors.push("Content can not be empty");
  }
  if (link.length == 0) {
    errors.push("Link is required");
  }
  if (content.length <= minContentLength) {
    errors.push("Content need more than " + minContentLength + " characters");
  }
  return errors;
}

function obtainValidationErrorsForBlog(title, content, id) {
  const errors = [];

  if (title.length == 0) {
    errors.push("Title can not be empty");
  }
  if (content.length == 0) {
    errors.push("Content can not be empty");
  }
  if (content.length <= minContentLength) {
    errors.push("Content need more than " + minContentLength + " characters");
  }
  return errors;
}

function handleDatabaseError(response, error) {
  console.error("Database error:", error);
  response.status(500).send("Internal Server Error");
}

app.engine("hbs", expressHandlebars.engine({
  defaultLayout: 'main.hbs'
}));

app.use(
  session({
    secret: "xakalpshvdsskanjnd",
    saveUninitialized: false,
    resave: false,
    store: new SQLiteStore(),
  })
);

app.use(express.urlencoded({
  extended: false
}));

app.use(express.static("static"));

app.use(function (request, response, next) {
  const isSignedIn = request.session.isSignedIn;
  response.locals.isSignedIn = isSignedIn;
  next();
});

// Basic Pages

app.get('/', function(request, response){
  response.render("landing.hbs");
});

app.get('/contact', function (request, response) {
  response.render("contact.hbs");
});

app.get('/about', function(request, response){
  response.render("about.hbs");
});

app.get('/sign-in', function(request, response){
  response.render("sign-in.hbs");
});

app.post('/sign-in', function (request, response) {
  const enteredUsername = request.body.username;
  const enteredPassword = request.body.password;

  if (
    enteredUsername == correctUsername &&
    bcrypt.compareSync(enteredPassword, correctHashedPassword)
  ) {
    request.session.isSignedIn = true;
    response.redirect("/");
  } else {
    response.redirect("/sign-in");
    }
  });

app.post("/sign-out", function (request, response) {
  request.session.isSignedIn = false;
  response.redirect("/");
});

//FAQ

app.get("/new-faq-post", function (request, response) {
  response.render("new-faq-post.hbs");
});

app.post("/new-faq-post", function (request, response) {
  const title = request.body.faqTitle;
  const content = request.body.faqContent;
  const id = request.body.faqId;

  const errors = obtainValidationErrorsForFaq(title, content, id);

  if (errors.length == 0) {
    const query = `INSERT INTO faq(faqTitle, faqContent ,faqId) VALUES (?, ?,?)`;
    const values = [title, content, id];
    db.run(query, values, function (error) {
      if (error) {
        handleDatabaseError(response, error);
      } else {
        response.redirect("/faqs");
      }
    });
  } else {
    const model = {
      errors,
      title,
      content,
    };
    response.render("new-faq-post.hbs", model);
  }
});

app.get('/faqs', function(request, response){
  const query = `SELECT * FROM faq`;

  db.all(query, function (error, faqPost) {
    if (error) {
      console.log(error);
    } else {
      console.log("no error");
      console.log(faqPost);
      const model = {
        faqPost,
      };
      response.render("faqs.hbs", model);
    }
  });
});

app.get("/faqPost/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM faq WHERE faqId = ?`;
  const values = [id];

  db.get(query, values, function (error, faqPost) {
    const model = {
      faqPost,
    };
    response.render("faqPost.hbs", model);
  });
});

app.get("/update-faq-post/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM faq WHERE faqId = ?`;
  const values = [id];

  db.get(query, values, function (error, faqPost) {
    const model = {
      faqPost,
    };
    if (request.session.isSignedIn) {
      response.render("update-faq-post.hbs", model);
    } else {
      response.redirect("/sign-in");
    }
  });
});

app.post("/update-faq-post/:id", function (request, response) {
  const id = request.params.id;
  const newTitle = request.body.title;
  const newContent = request.body.content;

  const errors = obtainValidationErrorsForFaq(newTitle, newContent, id);

  if (!request.session.isSignedIn) {
    response.redirect("/sign-in");
  }

  if (errors == 0) {
    const query = `UPDATE
    faq
    SET
    faqTitle = ?,
    faqContent = ?
    WHERE
    faqId = ?
    `;
    const values = [newTitle, newContent, id];

    db.run(query, values, function (error) {
      if (error) {
        handleDatabaseError(response, error);
      } else {
        response.redirect("/faqPost/" + id);
      }
    });
  } else {
    const model = {
      faqPost: {
        id,
        title: newTitle,
        content: newContent,
      },
      errors,
    };
    response.render("update-faq-post.hbs", model);
  }
});

app.post("/delete-faqPost/:id", function (request, response) {
  const id = request.params.id;
  
  const query = `DELETE FROM faq WHERE faqId = ?`;

  if (!request.session.isSignedIn) {
      response.redirect("/sign-in");
  } else {
    db.run(query, [id], function (error) {
      if (error) {
        handleDatabaseError(response, error);
      } else {
        response.redirect("/faqs");
      }
    });
  }
});



//Projecs 

app.get("/new-project", function (request, response) {
  if (request.session.isSignedIn) { 
    const model = {
    errors: [],
  }
    response.render("new-project.hbs", model);
  } else {
    response.redirect("/sign-in");
  }
});

app.post("/new-project", function (request, response) {
  const title = request.body.projectTitle;
  const content = request.body.projectContent;
  const link = request.body.projectLink;
  const id = request.body.projectId;

  const errors = obtainValidationErrorsForProjects(title, content, link, id,);

  if (!request.session.isSignedIn) {
    errors.push("You need to be signed in");
  }

  if (errors.length == 0) {
    const query = `INSERT INTO project(projectTitle, projectContent ,projectId, projectLink) VALUES (?, ?, ?, ?)`;
    const values = [title, content, id, link];
    db.run(query, values, function (error) {
      if (error) {
        handleDatabaseError(response, error);
      } else {
        response.redirect("/projects");
      }
    });
  } else {
    const model = {
      errors,
      title,
      content,
      link,
    };
    response.render("new-project.hbs", model);
  }
});

app.get('/projects', function(request, response){
  const query = `SELECT * FROM project`;

  db.all(query, function (error, projectPost) {
    if (error) {
      console.log(error);
    } else {
      console.log("no error");
      console.log(projectPost);
      const model = {
        projectPost,
      };
      response.render("projects.hbs", model);
    }
  });
});

app.get("/projectPost/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM project WHERE projectId = ?`;
  const values = [id];
  db.get(query, values, function (error, projectPost) {
    const model = {
      projectPost,
    };
    response.render("projectPost.hbs", model);
  });
});

app.get("/update-project/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM project WHERE projectId = ?`;
  const values = [id];

  db.get(query, values, function (error, projectPost) {
    const model = {
      projectPost,
    };
    if (request.session.isSignedIn) {
      response.render("update-project.hbs", model);
    } else {
      response.redirect("/sign-in");
    }
  });
});

app.post("/update-project/:id", function (request, response) {
  const id = request.params.id;
  const newTitle = request.body.title;
  const newContent = request.body.content;
  const newLink = request.body.link;

  const errors = obtainValidationErrorsForProjects(newTitle, newContent, newLink, id);

  if (!request.session.isSignedIn) {
    errors.push("You need to be signed in");
  }

  if (errors.length == 0) {
    const query = `UPDATE
    project
    SET
    projectTitle = ?,
    projectContent = ?,
    projectLink = ?
    WHERE
    projectId = ?
    `;
    const values = [newTitle, newContent, newLink, id];

    db.run(query, values, function (error) {
      if (error) {
        handleDatabaseError(response, error);
      } else {
        response.redirect("/projectPost/" + id);
      }
    });
  } else {
    const model = {
      projectPost: {
        id,
        title: newTitle,
        content: newContent,
        link: newLink,
      },
      errors,
    };
    response.render("update-project.hbs", model);
  }
});

app.post("/delete-projectPost/:id", function (request, response) {
  const id = request.params.id;
  
    const query = `DELETE FROM project WHERE projectId = ?`;

    if (!request.session.isSignedIn) {
      response.redirect("/sign-in");
    } else {
    db.run(query, [id], function (error) {
      if (error) {
        handleDatabaseError(response, error);
      } else {
        response.redirect("/projects");
      }
    });
  }
});

//Blog

app.get("/new-blog-post", function (request, response) {
  const model = {
    errors: [],
  }
  if (request.session.isSignedIn) {
    response.render("new-blog-post.hbs", model);
  } else {
    response.redirect("/sign-in");
  }
});

app.post("/new-blog-post", function (request, response) {
  const title = request.body.blogTitle;
  const content = request.body.blogContent;
  const id = request.body.blogId;

  const errors = obtainValidationErrorsForBlog(title, content, id);

  if (!request.session.isSignedIn) {
    errors.push("You need to be signed in");
  }

  if (errors.length == 0) {
    const query = `INSERT INTO blog (blogTitle, blogContent ,blogId) VALUES (?, ?,?)`;
    const values = [title, content, id];
    db.run(query, values, function (error) {
      if (error) {
        handleDatabaseError(response, error);
      } else {
        response.redirect("/blogs");
      }
    });
  } else {
    const model = {
      errors,
      title,
      content,
    };
    response.render("new-blog-post.hbs", model);
  }
});

app.get('/blogs', function(request, response){
  const query = `SELECT * FROM blog`;

  db.all(query, function (error, blogPost) {
    if (error) {
      console.log(error);
    } else {
      console.log("no error");
      console.log(blogPost);
      const model = {
        blogPost,
      };
      response.render("blogs.hbs", model);
    }
  });
});

app.get("/blogPost/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM blog WHERE blogId = ?`;
  const values = [id];
  db.get(query, values, function (error, blogPost) {
    const model = {
      blogPost,
    };
    response.render("blogPost.hbs", model);
  });
});

app.get("/update-blog-post/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM blog WHERE blogId = ?`;
  const values = [id];

  db.get(query, values, function (error, blogPost) {
    const model = {
      blogPost,
    };
      if (request.session.isSignedIn) {
      response.render("new-project.hbs", model);
    } else {
      response.redirect("/sign-in");
    }
  });
});

app.post("/update-blog-post/:id", function (request, response) {
  const id = request.params.id;
  const newTitle = request.body.title;
  const newContent = request.body.content;

  const errors = obtainValidationErrorsForBlog(newTitle, newContent, id);

  if (!request.session.isSignedIn) {
    errors.push("You need to be signed in");
  }

  if (errors == 0) {
    const query = `UPDATE
    blog
    SET
    blogTitle = ?,
    blogContent = ?
    WHERE
    blogId = ?
    `;
    const values = [newTitle, newContent, id];

    db.run(query, values, function (error) {
      if (error) {
        handleDatabaseError(response, error);
      } else {
        response.redirect("/blogPost/" + id);
      }
    });
  } else {
    const model = {
      blogPost: {
        id,
        title: newTitle,
        content: newContent,
      },
      errors,
    };
    response.render("update-blog-post.hbs", model);
  }
});

app.post("/delete-blogPost/:id", function (request, response) {
  const id = request.params.id;
  
  if (!request.session.isSignedIn) {
    response.redirect("/sign-in");
  } else {
    const query = `DELETE FROM blog WHERE blogId = ?`;

    db.run(query, [id], function (error) {
      if (error) {
        handleDatabaseError(response, error);
      } else {
        response.redirect("/blogs");
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});