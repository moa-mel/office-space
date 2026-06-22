import { Controller } from "@nestjs/common";
import { CallService } from "../services";

@Controller({
    path: 'call'
})

export class CallController{
    constructor(private readonly callService:CallService){}

}