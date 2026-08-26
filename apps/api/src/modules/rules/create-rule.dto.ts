import { Type } from "class-transformer";
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { RuleExecutionMode, RulePriorityLevel, ruleExecutionModes, rulePriorityLevels } from "@greecon/shared";
import { RuleActionDto } from "./rule-action.dto";
import { RuleConditionDto } from "./rule-condition.dto";

export class CreateRuleDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(rulePriorityLevels)
  priority!: RulePriorityLevel;

  @IsString()
  @IsNotEmpty()
  triggerType!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions!: RuleConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  constraints!: RuleConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  actions!: RuleActionDto[];

  @IsIn(ruleExecutionModes)
  executionMode!: RuleExecutionMode;

  @IsString()
  @IsNotEmpty()
  explanationTemplate!: string;

  @IsString()
  @IsNotEmpty()
  rollbackBehavior!: string;
}
