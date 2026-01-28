import { z } from "zod";
import { ForecastType } from "../../../domain/enums/forecast-type.enum";

export const createForecastSchema = z.object({
  planId: z.string().uuid(),
  name: z.string().min(3).max(100),
  type: z.nativeEnum(ForecastType),
});

export const addForecastItemSchema = z.object({
  forecastId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  notes: z.string().max(500).optional(),
});
