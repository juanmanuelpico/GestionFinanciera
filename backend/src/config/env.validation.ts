import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .required(),
  // Puerto interno del contenedor; se mantiene fijo fuera de .env.
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),
  CORS_ORIGIN: Joi.string().required(),
  ADMIN_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  ADMIN_PASSWORD: Joi.string().required(),
  ADMIN_NAME: Joi.string().required(),
});
