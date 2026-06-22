import { Controller } from "@nestjs/common";
import { AIService } from "../services";

@Controller({
    path: 'ai'
})

export class AIController{
    constructor(private readonly aiService:AIService){}

}