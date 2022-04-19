const { Router } = require('express');
const userValidationSchema = require('../constant/userValidationSchema');
const {
  addUser,
  loginUser,
  logOutUser,
} = require('../controllers/userController');
const hasUserLogin = require('../middlewares/hasUserLogin');
const validateUser = require('../middlewares/validateUser');

const router = Router();

router.post('/register', validateUser(userValidationSchema), addUser);
router.post('/login', validateUser(userValidationSchema), loginUser);
router.post('/logout', hasUserLogin, logOutUser);

module.exports = router;