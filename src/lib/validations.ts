import { z } from 'zod';

// Auth validations
export const loginSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const signupSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .max(100, 'Senha muito longa'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

// Transaction validations
export const transactionSchema = z.object({
  amount: z.number()
    .positive('O valor deve ser positivo')
    .max(1000000000, 'Valor muito alto'),
  description: z.string()
    .trim()
    .min(1, 'Descrição é obrigatória')
    .max(500, 'Descrição muito longa'),
  date: z.string().refine(val => !isNaN(Date.parse(val)), 'Data inválida'),
  type: z.enum(['income', 'expense', 'transfer']),
  accountId: z.string().uuid('ID da conta inválido'),
  categoryId: z.string().uuid('ID da categoria inválido').optional(),
  toAccountId: z.string().uuid('ID da conta destino inválido').optional(),
  currency: z.enum(['USD', 'BRL']).default('USD')
});

// Category validations
export const categorySchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome muito longo'),
  type: z.enum(['income', 'expense']),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida')
    .optional(),
});

// Account validations
export const accountSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome muito longo'),
  type: z.string()
    .trim()
    .min(1, 'Tipo é obrigatório')
    .max(50, 'Tipo muito longo'),
  balance: z.number()
    .min(-1000000000, 'Saldo muito baixo')
    .max(1000000000, 'Saldo muito alto'),
  currency: z.string()
    .trim()
    .length(3, 'Moeda deve ter 3 caracteres'),
  notes: z.string()
    .max(1000, 'Notas muito longas')
    .optional(),
});

// Asset validations
export const assetSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome muito longo'),
  symbol: z.string()
    .trim()
    .min(1, 'Símbolo é obrigatório')
    .max(20, 'Símbolo muito longo'),
  type: z.enum(['crypto', 'stock', 'other']),
  averagePrice: z.number()
    .positive('Preço médio deve ser positivo')
    .max(1000000000, 'Preço muito alto'),
  currentPrice: z.number()
    .positive('Preço atual deve ser positivo')
    .max(1000000000, 'Preço muito alto'),
  quantity: z.number()
    .positive('Quantidade deve ser positiva')
    .max(1000000000, 'Quantidade muito alta'),
  notes: z.string()
    .max(1000, 'Notas muito longas')
    .optional(),
});

// Pool validations
export const poolSchema = z.object({
  pairName: z.string()
    .trim()
    .min(1, 'Nome do par é obrigatório')
    .max(100, 'Nome muito longo'),
  asset1Symbol: z.string()
    .trim()
    .min(1, 'Símbolo do ativo 1 é obrigatório')
    .max(20, 'Símbolo muito longo'),
  asset2Symbol: z.string()
    .trim()
    .min(1, 'Símbolo do ativo 2 é obrigatório')
    .max(20, 'Símbolo muito longo'),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Data inválida'),
  endDate: z.string()
    .refine(val => !val || !isNaN(Date.parse(val)), 'Data inválida')
    .optional(),
  initialInvestment: z.number()
    .positive('Investimento inicial deve ser positivo')
    .max(1000000000, 'Valor muito alto'),
  feesGenerated: z.number()
    .min(0, 'Taxas não podem ser negativas')
    .max(1000000000, 'Valor muito alto'),
  rangePercentage: z.number()
    .positive('Range deve ser positivo')
    .max(100, 'Range máximo é 100%'),
  asset1CurrentPrice: z.number()
    .positive('Preço deve ser positivo')
    .max(1000000000, 'Preço muito alto'),
  asset2CurrentPrice: z.number()
    .positive('Preço deve ser positivo')
    .max(1000000000, 'Preço muito alto'),
  asset1Quantity: z.number()
    .positive('Quantidade deve ser positiva')
    .max(1000000000, 'Quantidade muito alta'),
  asset2Quantity: z.number()
    .positive('Quantidade deve ser positiva')
    .max(1000000000, 'Quantidade muito alta'),
  notes: z.string()
    .max(1000, 'Notas muito longas')
    .optional(),
});

// Exchange Rate validations
export const exchangeRateSchema = z.object({
  rate: z.number()
    .positive('A cotação deve ser um valor positivo')
    .min(0.01, 'A cotação mínima é 0.01')
    .max(10000, 'A cotação máxima é 10000')
    .finite('A cotação deve ser um número válido')
});

// Card validations
export const cardSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome muito longo'),
  creditLimit: z.number()
    .positive('Limite deve ser positivo')
    .max(1000000000, 'Limite muito alto'),
  accountId: z.string().uuid('Selecione uma conta válida'),
  currency: z.enum(['USD', 'BRL']).default('USD')
});

// Card Transaction validations
export const cardTransactionSchema = z.object({
  cardId: z.string().uuid('Selecione um cartão válido'),
  description: z.string()
    .trim()
    .min(1, 'Descrição é obrigatória')
    .max(500, 'Descrição muito longa'),
  totalAmount: z.number()
    .positive('Valor deve ser positivo')
    .max(1000000000, 'Valor muito alto'),
  installments: z.number()
    .int('Número de parcelas deve ser inteiro')
    .positive('Número de parcelas deve ser positivo')
    .min(1, 'Mínimo de 1 parcela')
    .max(48, 'Máximo de 48 parcelas'),
  currency: z.enum(['USD', 'BRL']).default('USD')
});

// Asset Transaction validations
export const assetTransactionSchema = z.object({
  assetId: z.string().uuid('ID do ativo inválido'),
  type: z.enum(['buy', 'sell']),
  price: z.number()
    .positive('O preço deve ser positivo')
    .finite('O preço deve ser um número válido')
    .max(1000000000, 'Preço muito alto'),
  quantity: z.number()
    .positive('A quantidade deve ser positiva')
    .finite('A quantidade deve ser um número válido')
    .max(1000000000, 'Quantidade muito alta'),
  currency: z.enum(['USD', 'BRL']).default('USD')
});

// Pay Invoice validations
export const payInvoiceSchema = z.object({
  installments: z.number()
    .int('Número de parcelas deve ser inteiro')
    .positive('Número de parcelas deve ser positivo')
    .min(1, 'Mínimo de 1 parcela')
    .max(1000, 'Número de parcelas muito alto')
});
