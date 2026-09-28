import { rateLimit } from 'express-rate-limit'

export const LoginLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	limit: 4,
	standardHeaders: true,
	legacyHeaders: false, 
	ipv6Subnet: 56, 
})

export const Accountlimiter = rateLimit({
	windowMs: 50 * 60 * 1000,
	limit: 20,
	standardHeaders: true,
	legacyHeaders: false, 
	ipv6Subnet: 56, 
})

export const resetPasswordlimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 3,
	standardHeaders: true,
	legacyHeaders: false, 
	ipv6Subnet: 56, 
})