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
import { InvalidFilterQueryError } from 'src/lib/models';

export type RsqlToMongoQueryResult =
  | { useAggregate: false; filter: object }
  | { useAggregate: true; pipeline: object[] };

export type RsqlToMongoRefDefinition =
  | {
      collection: string;
      localField: string;
      foreignField: string;
      as?: string;
    }
  | {
      collection: string;
      localField: string;
      foreignField: string;
      as: string;
      computedFields: Record<string, object>;
    };

export class RsqlToMongoTransformer {
  private supportedRefs: Record<string, RsqlToMongoRefDefinition> = {};
  private virtualFieldToRef: Record<string, string> = {};
  private usedRefs = new Set<string>();
  private usesRefs = false;

  constructor(refs: RsqlToMongoRefDefinition[] = []) {
    refs.forEach((ref) => {
      const key = ref.as ?? ref.localField;
      this.supportedRefs[key] = ref;

      if ('computedFields' in ref && ref.computedFields) {
        Object.keys(ref.computedFields).forEach((field) => {
          this.virtualFieldToRef[field] = key;
        });
      }
    });
  }

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
    if (selector.includes('.')) {
      const [refRoot] = selector.split('.');
      if (this.supportedRefs[refRoot]) {
        this.usedRefs.add(refRoot);
        this.usesRefs = true;
      }
    }

    const refKey = this.virtualFieldToRef[selector];

    if (refKey) {
      this.usedRefs.add(refKey);
      this.usesRefs = true;
    }

    switch (operator) {
      case EQ: {
        return { [selector]: value };
      }
      case NEQ: {
        return { [selector]: { $ne: value } };
      }
      case LE: {
        return { [selector]: { $lte: value } };
      }
      case GE: {
        return { [selector]: { $gte: value } };
      }
      case LT: {
        return { [selector]: { $lt: value } };
      }
      case GT: {
        return { [selector]: { $gt: value } };
      }
      case IN: {
        return { [selector]: { $in: value } };
      }
      case OUT: {
        return { [selector]: { $nin: value } };
      }
      case '=like=': {
        return { [selector]: { $regex: value } };
      }
      default: {
        throw new InvalidFilterQueryError();
      }
    }
  }

  public transform(rsql: string): RsqlToMongoQueryResult {
    let rootNode: ExpressionNode;

    this.usedRefs.clear();
    this.usesRefs = false;

    try {
      rootNode = parse(rsql);
    } catch {
      throw new InvalidFilterQueryError();
    }

    const matchStage = this.visitExpressionNode(rootNode);

    if (this.usesRefs) {
      const lookupStages: object[] = [];

      for (const ref of this.usedRefs) {
        const refDef = this.supportedRefs[ref];
        const asField = refDef.as ?? refDef.localField;

        lookupStages.push({
          $lookup: {
            from: refDef.collection,
            localField: refDef.localField,
            foreignField: refDef.foreignField,
            as: asField,
          },
        });

        if ('computedFields' in refDef && refDef.computedFields) {
          lookupStages.push(
            { $addFields: refDef.computedFields },
            { $project: { [asField]: 0 } },
          );
        } else {
          lookupStages.push({
            $unwind: {
              path: `$${asField}`,
              preserveNullAndEmptyArrays: false,
            },
          });
        }
      }

      return {
        useAggregate: true,
        pipeline: [...lookupStages, { $match: matchStage }],
      };
    }

    return {
      useAggregate: false,
      filter: matchStage,
    };
  }
}
