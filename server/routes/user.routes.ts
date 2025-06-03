import { Router } from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/auth.middleware';
import { getAllUsers, createUser, deleteUser } from '../controllers/user.controller';

const router = Router();

// Lista de usuários - permitido para qualquer usuário autenticado
router.get('/', isAuthenticated, getAllUsers);

// Criar novo usuário (somente administradores)
router.post('/', isAdmin, createUser);

// Excluir usuário (somente administradores)
router.delete('/:id', isAdmin, deleteUser);

export default router; 