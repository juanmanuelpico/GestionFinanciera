import { PartialType } from '@nestjs/swagger';
import { CreateFixedExpenseDto } from './create-fixed-expense.dto.js';

export class UpdateFixedExpenseDto extends PartialType(CreateFixedExpenseDto) {}
