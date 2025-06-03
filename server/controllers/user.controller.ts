import type { Request, Response } from "express";
import { storage } from "../storage"; // Adjust path as needed
import { hashPassword } from "../utils/auth.utils"; // Import the moved function

// Lista de usuários
export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await storage.getAllUsers();
    // Remove password hash before sending to client
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json(safeUsers);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ message: "Erro ao buscar usuários" });
  }
};

// Excluir usuário
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent self-deletion
    if (userId === req.user?.id) {
      return res.status(400).json({ message: "Não é possível excluir o próprio usuário" });
    }

    const success = await storage.deleteUser(userId);
    if (success) {
      res.status(200).json({ message: "Usuário excluído com sucesso" });
    } else {
      res.status(404).json({ message: "Usuário não encontrado" });
    }
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    res.status(500).json({ message: "Erro ao excluir usuário" });
  }
};

// Criar novo usuário
export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: "Nome de usuário, senha e perfil são obrigatórios" });
    }

    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Nome de usuário já existe" });
    }

    const validRoles = ["admin", "marketing", "comercial", "trainer"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Perfil inválido" });
    }

    const hashedPassword = await hashPassword(password);
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      role
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ message: "Erro ao criar usuário" });
  }
}; 