const express = require("express");
const router = express.Router();
const userModel = require("./users");
const postmodel = require("./post");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const upload = require("./multer");

passport.use(new LocalStrategy(userModel.authenticate()));
passport.serializeUser(userModel.serializeUser());
passport.deserializeUser(userModel.deserializeUser());

router.get("/", function (req, res, next) {
  res.render("index");
});

router.get("/login", function (req, res, next) {
  res.render("login", { error: req.flash("error") });
});
router.get("/signup", function (req, res, next) {
  res.render("signup");
});

router.post("/delete/:id", async function (req, res) {
  const del = await postmodel.findOneAndDelete({ _id: req.params.id });
  res.redirect("/profile");
});

router.get("/profile", isLoggedIn, async function (req, res, next) {
  const user = await userModel
    .findOne({
      username: req.session.passport.user,
    })
    .populate("posts");
  res.render("profile", { user });
});

router.get("/feed", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({
    username: req.session.passport.user,
  });
  const posts = await postmodel.find().populate("user");
  res.render("feed", { user, posts });
});

router.post(
  "/fileupload",
  isLoggedIn,
  upload.single("image"),
  async function (req, res, next) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    user.profileimage = req.file.filename;
    await user.save();
    res.redirect("/profile");
  }
);

router.post(
  "/upload",
  isLoggedIn,
  upload.single("file"),
  async function (req, res, next) {
    if (!req.file) {
      return res.status(404).send("no file were Given");
    }
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    const post = await postmodel.create({
      image: req.file.filename,
      imagetext: req.body.filecaption,
      user: user._id,
    });

    await user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
  }
);

router.post("/register", function (req, res, next) {
  const { username, email, fullname } = req.body;
  const userData = new userModel({ username, email, fullname });

  userModel.register(userData, req.body.password).then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/login");
    });
  });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

router.get("/logout", function (req, res, next) {
  req.logout();
  res.redirect("/");
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

module.exports = router;
