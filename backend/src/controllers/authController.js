import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import VerificationCode from '../models/VerificationCode.js';
import { sendVerificationCode } from '../utils/emailService.js';
import { generateVerificationCode } from '../utils/generateCode.js';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Solicitar código de verificación para registro
export const requestRegistrationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'El correo electrónico es requerido' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Este correo electrónico ya está registrado' });
    }

    // Generar código
    const code = generateVerificationCode();

    // Eliminar códigos anteriores no usados para este email y tipo
    await VerificationCode.deleteMany({
      email: email.toLowerCase(),
      type: 'registration',
      used: false,
    });

    // Guardar código en la base de datos
    const verificationCode = new VerificationCode({
      email: email.toLowerCase(),
      code,
      type: 'registration',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
    });

    await verificationCode.save();

    // Enviar código por correo
    await sendVerificationCode(email.toLowerCase(), code, 'registration');

    res.json({
      message: 'Código de verificación enviado al correo principal del administrador',
    });
  } catch (error) {
    console.error('Error en requestRegistrationCode:', error);
    res.status(500).json({ message: 'Error al solicitar código de verificación' });
  }
};

// Verificar código y registrar usuario
export const verifyCodeAndRegister = async (req, res) => {
  try {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Buscar código de verificación
    const verificationCode = await VerificationCode.findOne({
      email: email.toLowerCase(),
      code,
      type: 'registration',
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verificationCode) {
      return res.status(400).json({ message: 'Código inválido o expirado' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Este correo electrónico ya está registrado' });
    }

    // Crear usuario
    const user = new User({
      email: email.toLowerCase(),
      password,
      role: req.body.role || 'user', // Permitir rol personalizado (admin/seller)
    });

    await user.save();

    // Marcar código como usado
    verificationCode.used = true;
    await verificationCode.save();

    // Generar token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error en verifyCodeAndRegister:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Este correo electrónico ya está registrado' });
    }
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ message: 'Correo electrónico y contraseña son requeridos' });
    }

    // Buscar usuario
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found in DB');
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generar token
    const token = generateToken(user._id);

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

// Solicitar código de recuperación de contraseña
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'El correo electrónico es requerido' });
    }

    // Verificar si el usuario existe
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Por seguridad, no revelamos si el usuario existe o no
      return res.json({
        message: 'Si el correo existe, se ha enviado un código de verificación',
      });
    }

    // Generar código
    const code = generateVerificationCode();

    // Eliminar códigos anteriores no usados
    await VerificationCode.deleteMany({
      email: email.toLowerCase(),
      type: 'password_reset',
      used: false,
    });

    // Guardar código
    const verificationCode = new VerificationCode({
      email: email.toLowerCase(),
      code,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await verificationCode.save();

    // Enviar código por correo
    await sendVerificationCode(email.toLowerCase(), code, 'password_reset');

    res.json({
      message: 'Si el correo existe, se ha enviado un código de verificación',
    }); 
  } catch (error) {
    console.error('Error en requestPasswordReset:', error);
    res.status(500).json({ message: 'Error al solicitar recuperación de contraseña' });
  }
};

// Verificar código y restablecer contraseña
export const verifyCodeAndResetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Buscar código de verificación
    const verificationCode = await VerificationCode.findOne({
      email: email.toLowerCase(),
      code,
      type: 'password_reset',
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verificationCode) {
      return res.status(400).json({ message: 'Código inválido o expirado' });
    }

    // Buscar usuario
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    // Marcar código como usado
    verificationCode.used = true;
    await verificationCode.save();

    res.json({
      message: 'Contraseña restablecida exitosamente',
    });
  } catch (error) {
    console.error('Error en verifyCodeAndResetPassword:', error);
    res.status(500).json({ message: 'Error al restablecer contraseña' });
  }
};

// Obtener usuario actual
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error en getCurrentUser:', error);
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
};

