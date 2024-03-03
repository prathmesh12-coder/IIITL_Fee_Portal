const express = require("express");
const app = express();
const passport = require("passport");
const session = require("express-session");
const User = require("./models/user");
const Batch = require("./models/batch");
const Chat = require("./models/chat");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const path = require("path");
const { storage } = require("./cloudinary/index.js");
//pdf file upload setup
const multer = require("multer");
const upload = multer({ storage });
const semester = require("./views/Admin/SemesterData.js");
const CronJob = require("cron").CronJob;
app.use(express.json());

const dbUrl =
  process.env.DB_URL || "mongodb://127.0.0.1:27017/IIITL_Fee_Portal";
mongoose
  .connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("connection open ");
  })
  .catch((err) => {
    console.log("Error occurs");
  });

const PORT = process.env.PORT || 5000;

require("./auth");
// Middle part

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "views")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

function isLoggedIn(req, res, next) {
  req.user ? next() : res.redirect("/login");
}

async function isAdmin(req, res, next) {
  let userData = await User.findOne({ email: req.user.email }).exec();
  if (userData == null) {
    res.send("Email ID Not Registered");
  } else {
    const user = await User.findOne({
      email: userData.email,
    });
    user.name = req.user.displayName;
    await user.save();
    const role = userData.role;
    userData.role && role == "admin" ? next() : res.redirect("/profile");
  }
}

app.use(
  session({
    secret: "mypassword",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/auth/protected", isLoggedIn, (req, res) => {
  res.redirect("/dashboard");
});

app.use("/auth/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

//mongodb login signup
app.post("/signUp", async (req, res) => {
  const { password, username, confirmpassword, email } = req.body;
  if (confirmpassword === password) {
    const hash = await bcrypt.hash(password, 12);
    const user = new User({
      username,
      email,
      password: hash,
    });

    await user.save();
    res.redirect("Admin/dashboard");
  } else {
    res.send("Confirm password once again");
  }
});

app.post("/Login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  const validpass = await bcrypt.compare(password, user.password);

  if (validpass) {
    res.status(200).redirect("/");
    // res.redirect('/')
  } else {
    res.status(200).send("Try correct password");
  }
});

app.get("/login", (req, res) => {
  res.render("Login");
});

app.get("/", (req, res) => {
  res.render("../public/homepage/homepage");
});

//google login
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
    hostedDomain: "iiitl.ac.in",
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/auth/protected",
    failureRedirect: "/auth/google/failure",
  })
);

app.get("/auth/google/failure", (req, res) => {
  res.send("not log in");
});

function convertDateFormat(str) {
  let date = new Date(str),
    mnth = ("0" + (date.getMonth() + 1)).slice(-2),
    day = ("0" + date.getDate()).slice(-2);
  return [date.getFullYear(), mnth, day].join("-");
}

function convertToLower(str) {
  return str.replace(/[A-Z]/g, (match) => match.toLowerCase());
}

async function calculateDashboardData(dashboardData) {
  const users = await User.find({});
  for (let user of users) {
    for (let sem of user.semester) {
      if (sem.feeStatus == "pending") {
        dashboardData.feesPending += sem.amount;
      } else {
        dashboardData.feesPaid += sem.amount;
        if (sem.feeType == "Semester") {
          dashboardData.chart2Data[0] += sem.amount;
        } else if (sem.feeType == "Mess") {
          dashboardData.chart2Data[1] += sem.amount;
        } else if (sem.feeType == "Fine") {
          dashboardData.chart2Data[2] += sem.amount;
        }
      }
    }
  }
}

async function calculateMonthlyData(dashboardData) {
  const users = await User.find({});
  for (let user of users) {
    for (let sem of user.semester) {
      if (sem.feeStatus == "paid") {
        let idx = sem.paymentDate.slice(5, 7);
        idx = parseInt(idx) - 1;
        dashboardData.monthlyFeesCollected[idx] += sem.amount;
      }
    }
  }
}

async function calculateProfileData(profileData, email) {
  const user = await User.findOne({ email: email });
  for (let sem of user.semester) {
    if (sem.feeStatus == "paid") {
      profileData.feesPaid += sem.amount;
    } else {
      profileData.feesPending += sem.amount;
    }

    if (sem.feeType == "Fine" || sem.fineAmount > 0) {
      profileData.fineNumber += 1;
      profileData.fineAmount += sem.fineAmount;
    }
    if (sem.feeType == "Fine") profileData.fineAmount += sem.amount;
  }
}

//Admin Panel
app.get("/dashboard", [isLoggedIn, isAdmin], async (req, res) => {
  const batches = await Batch.find({});
  let totalStudents = 0;
  const batchSize = batches.length;
  batches.forEach((batch) => {
    totalStudents += batch.batchStrength;
  });
  let { displayName, email } = req.user;
  email = convertToLower(email);
  const rollNumber = email.slice(0, email.indexOf("@"));
  let dashboardData = {
    feesPending: 0,
    feesPaid: 0,
    chart2Data: [0, 0, 0], //[semesterPaid,messPaid,finePaid]
    monthlyFeesCollected: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // jan to dec
  };

  await calculateDashboardData(dashboardData);
  await calculateMonthlyData(dashboardData);

  res.render("Admin/dashboard", {
    userName: displayName,
    email: email,
    rollNumber: rollNumber,
    semester: semester,
    batchSize,
    totalStudents,
    dashboardData,
  });
});

app.get("/payment_confirmation/", [isLoggedIn, isAdmin], async (req, res) => {
  let { displayName, email } = req.user;
  let { studentEmail, studentRoll, transID } = req.query;
  email = convertToLower(email);
  const rollNumber = email.slice(0, email.indexOf("@"));
  let feeData;
  await User.findOne(
    {
      email: studentEmail,
      "semester._id": transID,
    },
    {
      "semester.$": 1,
    }
  ).then((user) => {
    const semester = user.semester[0]; // the matching semester object
    feeData = semester;
  });
  res.render("Admin/payment_confirmation", {
    userName: displayName,
    email: email,
    rollNumber: rollNumber,
    semester: semester,
    formData: {
      studentRoll: studentRoll,
      studentEmail: studentEmail,
      amount: feeData.amount,
      semNo: feeData.semNo,
      fineAmount: feeData.fineAmount,
      feeType: feeData.feeType,
      transID: transID,
    },
  });
});

app.post(
  "/payment_confirmation/",
  [isLoggedIn, isAdmin, upload.single("reciept")],
  async (req, res) => {
    let { SBIref, paymentDate, transID, email } = req.body;
    email = convertToLower(email);
    paymentDate = convertDateFormat(paymentDate);
    const rollNumber = email.slice(0, email.indexOf("@"));
    const user = await User.findOne({
      email: email,
    }).populate({ path: "semester" });
    for (let sem of user.semester) {
      if (sem._id == transID) {
        sem.feeStatus = "paid";
        sem.SBIref = SBIref;
        sem.paymentDate = paymentDate;
        if (req.file) {
          sem.receiptURL = req.file.path;
        }
        await user.save();
      }
    }
    res.redirect("/search_student_details/");
  }
);

app.get("/search_student_details/", [isLoggedIn, isAdmin], (req, res) => {
  let { displayName, email } = req.user;
  email = convertToLower(email);
  const roll = email.slice(0, email.indexOf("@"));
  const data = null;
  res.render("Admin/search_student_details", {
    userName: displayName,
    email: email,
    rollNumber: roll,
    data: data,
    valid: "",
  });
});

app.post(
  "/search_student_details/",
  [isLoggedIn, isAdmin],
  async (req, res) => {
    let { displayName, email } = req.user;
    let { rollNumber } = req.body;
    rollNumber = convertToLower(rollNumber);
    let data = await User.findOne({ roll: rollNumber }).populate({
      path: "semester",
    });
    let valid = "";
    let studentEmail, studentRoll, studentName;
    if (data == null) {
      valid = "Roll Number does not exist...";
    } else {
      valid = "";
      studentEmail = data.email;
      studentRoll = data.roll;
      studentName = data.name;
      data = data.semester;
    }

    email = convertToLower(email);
    const roll = email.slice(0, email.indexOf("@"));
    res.render("Admin/search_student_details", {
      userName: displayName,
      email: email,
      rollNumber: roll,
      data: data,
      studentName: studentName,
      studentRoll: studentRoll,
      studentEmail: studentEmail,
      valid: valid,
    });
  }
);

app.get("/send_payment_link/", [isLoggedIn, isAdmin], async (req, res) => {
  let { displayName, email } = req.user;
  email = convertToLower(email);
  const rollNumber = email.slice(0, email.indexOf("@"));
  const batch = [];
  async function getItems() {
    const Items = await Batch.find({});
    return Items;
  }

  await getItems().then(function (FoundItems) {
    FoundItems.forEach(function (item) {
      batch.push(item.batch);
    });
  });

  res.render("Admin/send_payment_link", {
    userName: displayName,
    email: email,
    rollNumber: rollNumber,
    batch: batch,
    semester: semester,
  });
});

app.post(
  "/send_payment_link/",
  [isLoggedIn, isAdmin, upload.single("pdfFile")],
  async (req, res) => {
    let { branch, roll, dueDate } = req.body;
    roll = convertToLower(roll);
    dueDate = convertDateFormat(dueDate);
    if (roll == "") {
      const batch = await Batch.findOne({ batch: branch });
      const batch_strength = batch.batchStrength;
      const roll_prefix = batch.rollPrefix;
      for (let i = 1; i <= batch_strength; i++) {
        let email = roll_prefix + i + "@iiitl.ac.in";
        let roll = roll_prefix + i;
        if (i < 10) {
          email = roll_prefix + "0" + i + "@iiitl.ac.in";
          roll = roll_prefix + "0" + i;
        }
        await User.findOneAndUpdate(
          {
            email: email,
            roll: roll,
          },
          {
            $push: {
              semester: {
                amount: req.body.amount,
                semNo: req.body.semNo,
                feeType: req.body.feeType,
                paymentLink: req.body.paymentLink,
                dueDate: dueDate,
              },
            },
          },
          {
            new: true,
            upsert: true,
          }
        );
      }
    } else {
      const email = roll + "@iiitl.ac.in";
      await User.findOneAndUpdate(
        {
          email: email,
          roll: roll,
        },
        {
          $push: {
            semester: {
              amount: req.body.amount,
              semNo: req.body.semNo,
              feeType: req.body.feeType,
              dueDate: dueDate,
              paymentLink: req.body.paymentLink,
            },
          },
        },
        {
          new: true,
          upsert: true,
        }
      );
    }
    res.redirect("/send_payment_link/");
  }
);

app.get("/add_student/", [isLoggedIn, isAdmin], (req, res) => {
  let { displayName, email } = req.user;
  email = convertToLower(email);
  const rollNumber = email.slice(0, email.indexOf("@"));
  res.render("Admin/add_student", {
    userName: displayName,
    email: email,
    rollNumber: rollNumber,
    semester: semester,
  });
});

app.post("/add_student/", [isLoggedIn, isAdmin], async (req, res) => {
  let { branch_name, batch_strength, roll_prefix } = req.body;
  roll_prefix = convertToLower(roll_prefix);
  await Batch.findOneAndUpdate(
    {
      batch: branch_name,
    },
    {
      batchStrength: batch_strength,
      rollPrefix: roll_prefix,
    },
    {
      new: true,
      upsert: true,
    }
  );
  for (let i = 1; i <= batch_strength; i++) {
    let email = roll_prefix + i + "@iiitl.ac.in";
    let roll = roll_prefix + i;
    if (i < 10) {
      email = roll_prefix + "0" + i + "@iiitl.ac.in";
      roll = roll_prefix + "0" + i;
    }
    await User.findOneAndUpdate(
      {
        email: email,
        roll: roll,
      },
      { semester: [] },
      {
        new: true,
        upsert: true,
      }
    );
    await Chat.findOneAndUpdate(
      {
        senderEmail: email,
      },
      {
        chat: [],
        unreadCount: 0,
      },
      {
        new: true,
        upsert: true,
      }
    );
  }
  res.redirect("/add_student/");
});

app.get("/answer_queries/", [isLoggedIn, isAdmin], async (req, res) => {
  let { displayName, email, picture } = req.user;
  let chats = await Chat.find({});
  chats.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
  email = convertToLower(email);
  const rollNumber = email.slice(0, email.indexOf("@"));
  res.render("Admin/answer_queries", {
    userName: displayName,
    email,
    rollNumber,
    picture,
    orderedChats: chats,
  });
});

app.post("/answer_queries/", [isLoggedIn, isAdmin], async (req, res) => {
  const { message, textEmail } = req.body;
  const { email } = req.user;
  await Chat.findOneAndUpdate(
    {
      senderEmail: textEmail,
    },
    {
      $push: {
        chat: {
          textEmail: email,
          message: message,
        },
      },
      lastUpdated: new Date(),
      unreadCount: 0,
    },
    {
      new: true,
      upsert: true,
    }
  );
  res.redirect("/answer_queries/");
});

app.post("/deleteChat/", [isLoggedIn, isAdmin], async (req, res) => {
  const { textEmail } = req.body;
  const chats = await Chat.findOne({
    senderEmail: textEmail,
  });
  chats.chat = [];
  chats.unreadCount = 0;
  chats.save();
  res.redirect("/answer_queries/");
});

//Student Panel
app.get("/profile/", isLoggedIn, async (req, res) => {
  let { displayName, email, picture } = req.user;
  email = convertToLower(email);
  const rollNumber = email.slice(0, email.indexOf("@"));
  let profileData = {
    feesPaid: 0,
    fineAmount: 0,
    feesPending: 0,
    fineNumber: 0,
  };
  await calculateProfileData(profileData, email);
  res.render("Student/profile", {
    userName: displayName,
    email,
    rollNumber,
    picture,
    profileData,
  });
});

app.get("/pay_fees/", isLoggedIn, async (req, res) => {
  let { displayName, email, picture } = req.user;
  email = convertToLower(email);
  const rollNumber = email.slice(0, email.indexOf("@"));
  let data;
  await User.find({ email: email, "semester.feeStatus": "pending" })
    .then((users) => {
      data = users.flatMap((user) =>
        user.semester.filter((sem) => sem.feeStatus === "pending")
      );
      data.sort((a, b) => a.semNo.localeCompare(b.semNo)); // Sort by semNo field
    })
    .catch((err) => console.log(err));
  res.render("Student/pay_fees", {
    userName: displayName,
    email,
    data,
    rollNumber,
    picture,
  });
});

app.get("/payment_history/", isLoggedIn, async (req, res) => {
  let { displayName, email, picture } = req.user;
  email = convertToLower(email);
  const rollNumber = email.slice(0, email.indexOf("@"));
  let data;
  await User.find({ email: email, "semester.feeStatus": "paid" })
    .then((users) => {
      data = users.flatMap((user) =>
        user.semester.filter((sem) => sem.feeStatus === "paid")
      );
      data.sort((a, b) => a.semNo.localeCompare(b.semNo)); // Sort by semNo field
    })
    .catch((err) => console.log(err));
  res.render("Student/payment_history", {
    userName: displayName,
    email,
    data,
    rollNumber,
    picture,
  });
});

app.get("/download_receipt/", isLoggedIn, async (req, res) => {
  let { displayName, email, picture } = req.user;
  email = convertToLower(email);
  const rollNumber = email.slice(0, email.indexOf("@"));
  let data;
  await User.find({ email: email, "semester.feeStatus": "paid" })
    .then((users) => {
      data = users.flatMap((user) =>
        user.semester.filter((sem) => sem.feeStatus === "paid")
      );
      data.sort((a, b) => a.semNo.localeCompare(b.semNo)); // Sort by semNo field
    })
    .catch((err) => console.log(err));
  res.render("Student/download_receipt", {
    userName: displayName,
    email,
    data,
    rollNumber,
    picture,
  });
});

app.get("/chat/", isLoggedIn, async (req, res) => {
  let { displayName, email, picture } = req.user;
  let messages = await Chat.findOne({ senderEmail: email }).populate({
    path: "chat",
  });
  if (messages) {
    messages = messages.chat;
  } else {
    messages = [];
  }
  email = convertToLower(email);
  const rollNumber = email.slice(0, email.indexOf("@"));
  res.render("Student/chat", {
    userName: displayName,
    email,
    rollNumber,
    picture,
    messages,
  });
});

app.post("/chat/", isLoggedIn, async (req, res) => {
  const { message, textEmail } = req.body;
  let unreadCount = await Chat.findOne({ senderEmail: textEmail });
  unreadCount = unreadCount.unreadCount;
  await Chat.findOneAndUpdate(
    {
      senderEmail: textEmail,
    },
    {
      $push: {
        chat: {
          textEmail: textEmail,
          message: message,
        },
      },
      lastUpdated: new Date(),
      unreadCount: unreadCount + 1,
    },
    {
      new: true,
      upsert: true,
    }
  );
  res.redirect("/chat/");
});

const job = new CronJob(
  "00 00 00 * * *",
  async function () {
    const batch = await Batch.find({}).exec();
    for (let j = 0; j < batch.length; j++) {
      const batch_strength = batch[j].batchStrength;
      const roll_prefix = batch[j].rollPrefix;
      for (let i = 1; i <= batch_strength; i++) {
        let email = roll_prefix + i + "@iiitl.ac.in";
        let roll = roll_prefix + i;
        if (i < 10) {
          email = roll_prefix + "0" + i + "@iiitl.ac.in";
          roll = roll_prefix + "0" + i;
        }
        const user = await User.findOne({
          email: email,
        }).populate({ path: "semester" });
        for (let sem of user.semester) {
          const dueDate = new Date(sem.dueDate); // example due date
          const currentDate = new Date();
          const difference = currentDate.getTime() - dueDate.getTime();
          const differenceInDays =
            Math.ceil(difference / (1000 * 60 * 60 * 24)) - 1;
          if (
            sem.feeType != "fine" &&
            differenceInDays > 0 &&
            differenceInDays <= 5
          ) {
            sem.fineAmount = 1000;
          } else if (sem.feeType != "fine" && differenceInDays > 5) {
            sem.fineAmount = 5000;
          }
          await user.save();
        }
      }
    }
  },
  null,
  true,
  "Asia/Kolkata"
);
job.start();

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
