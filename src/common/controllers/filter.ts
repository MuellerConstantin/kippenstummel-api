import { parse } from '@rsql/parser';
import {
  isLogicNode,
  ExpressionNode,
  LogicNode,
  ComparisonNode,
  getSelector,
  getValue,
  AND,
  EQ,
  NEQ,
  LE,
  GE,
  LT,
  GT,
  IN,
  OUT,
  AND_VERBOSE,
} from '@rsql/ast';
import { InvalidFilterQueryError } from '../models';

export class RsqlToMongoTransformer {
  private visitAndNode(node: LogicNode): object {
    const left = this.visitExpressionNode(node.left);
    const right = this.visitExpressionNode(node.right);
    return { $and: [left, right] };
  }

  private visitOrNode(node: LogicNode): object {
    const left = this.visitExpressionNode(node.left);
    const right = this.visitExpressionNode(node.right);
    return { $or: [left, right] };
  }

  private visitComparisonNode(node: ComparisonNode): object {
    const selector = getSelector(node);
    const operator = node.operator;
    const value = getValue(node);

    return this.transformExpression(selector, operator, value);
  }

  private visitExpressionNode(node: ExpressionNode): object {
    if (isLogicNode(node)) {
      if (node.operator === AND || node.operator === AND_VERBOSE) {
        return this.visitAndNode(node);
      }

      return this.visitOrNode(node);
    }

    return this.visitComparisonNode(node);
  }

  protected transformExpression(
    selector: string,
    operator: string,
    value: string | string[] | number,
  ): object {
    switch (operator) {
      case EQ: {
        return { [selector]: value };
        break;
      }
      case NEQ: {
        return { [selector]: { $ne: value } };
        break;
      }
      case LE: {
        return { [selector]: { $lte: value } };
        break;
      }
      case GE: {
        return { [selector]: { $gte: value } };
        break;
      }
      case LT: {
        return { [selector]: { $lt: value } };
        break;
      }
      case GT: {
        return { [selector]: { $gt: value } };
        break;
      }
      case IN: {
        return { [selector]: { $in: value } };
        break;
      }
      case OUT: {
        return { [selector]: { $nin: value } };
        break;
      }
      case '=like=': {
        return { [selector]: { $regex: value } };
        break;
      }
      default: {
        throw new InvalidFilterQueryError();
      }
    }
  }

  public transform(rsql: string): object {
    let rootNode: ExpressionNode;

    try {
      rootNode = parse(rsql);
    } catch {
      throw new InvalidFilterQueryError();
    }

    return this.visitExpressionNode(rootNode);
  }
}
