import { Type } from "class-transformer";
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { RuleExecutionMode, RulePriorityLevel, ruleExecutionModes, rulePriorityLevels } from "@greecon/shared";
import { RuleActionDto } from "./rule-action.dto";
import { RuleConditionDto } from "./rule-condition.dto";

export class UpdateRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsIn(rulePriorityLevels)
  priority?: RulePriorityLevel;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions?: RuleConditionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  constraints?: RuleConditionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  actions?: RuleActionDto[];

  @IsOptional()
  @IsIn(ruleExecutionModes)
  executionMode?: RuleExecutionMode;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  explanationTemplate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  rollbackBehavior?: string;
}
