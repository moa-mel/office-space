import { Controller, Get, Param } from "@nestjs/common";
import { CallService } from "../services";

@Controller({
    path: 'call'
})
export class CallController {
    constructor(private readonly callService: CallService) { }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.callService.findOne(id);
    }
}