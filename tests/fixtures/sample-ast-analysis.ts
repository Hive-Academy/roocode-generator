/* eslint-disable */
// @ts-nocheck - Test fixture file, types/imports don't need to resolve

/**
 * Sample file for testing AST analysis with various code constructs.
 * This is a test fixture - imports and decorators don't need to resolve,
 * we just need the AST structure to match real-world code for testing the parser.
 */

// Declare decorators to satisfy TypeScript for AST parsing purposes
declare function Component(config: any): ClassDecorator;
declare function Input(): PropertyDecorator;
declare function Inject(token: string): ParameterDecorator;
declare function Optional(): ParameterDecorator;
declare function Decorator(): MethodDecorator;
declare function Computed(): PropertyDecorator;
declare function Watch(eventName: string): MethodDecorator;
declare function Param(paramName: string): ParameterDecorator;
declare function Min(value: number): ParameterDecorator;
declare function Max(value: number): ParameterDecorator;

import React from 'react';
import { useState, useEffect } from 'react';
import * as utils from './utils';
import type { ILogger } from '../services/logger-service';

// Dummy interfaces/types to satisfy TypeScript for AST parsing purposes
interface Config {}

@Component({
  selector: 'app-root',
  template: './app.component.html',
})
export class UserProfile {
  @Input() private name: string;

  constructor(
    private readonly logger: ILogger,
    @Optional() protected config?: Config
  ) {
    this.name = '';
  }

  @Decorator()
  public async getData(): Promise<any> {
    return fetch('/api/data');
  }

  @Computed
  private static formatName(input: string): string {
    return input.trim();
  }

  @Watch('name')
  protected onNameChange(
    @Param('newValue') newValue: string,
    @Param('oldValue') oldValue: string
  ): void {
    this.logger.debug(`Name changed from ${oldValue} to ${newValue}`);
  }

  private get formattedName(): string {
    return UserProfile.formatName(this.name);
  }

  private set formattedName(value: string) {
    this.name = value.trim();
  }
}

export function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

const processData = async (data: any[]): Promise<void> => {
  await Promise.all(data.map((item) => item.process()));
};

/*
This fixture file tests AST parsing of:
- Regular imports and type imports
- Class with multiple decorators
- Constructor with injected dependencies and optional parameters
- Methods with various decorators and modifiers (public, private, protected, static)
- Decorated parameters in methods
- Getter and setter methods
- Regular function with decorated parameters
- Arrow function
- Various parameter types and decorators
- Complex nesting of decorators and modifiers

Note: This is a test fixture - imports and decorators don't need to resolve,
we just need the AST structure to match real-world code for testing the parser.
*/
