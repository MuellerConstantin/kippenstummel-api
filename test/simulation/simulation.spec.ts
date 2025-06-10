import * as fs from 'fs';
import * as path from 'path';
import { CredibilityHeuristic } from 'src/ident/services/ident.service';
import { IdentInfo } from 'src/ident/models';
import {
  generateNormalIdent,
  generateMaliciousIdent,
  generateNewbieIdent,
  generatePowerIdent,
} from './profiles';

const identities = new Map<string, IdentInfo>();

describe('CredibilitySimulation', () => {
  const simulateProfile = (
    name: string,
    profileGenerator: () => IdentInfo,
    count: number,
  ) => {
    for (let index = 0; index < count; index++) {
      const result = profileGenerator();
      identities.set(result.identity, result);
    }

    const credibilities: number[] = [];
    const ruleTraces: {
      identity: IdentInfo;
      credibility: number;
      trace: Map<string, number>;
    }[] = [];

    for (const ident of identities.values()) {
      const ruleTrace = {
        identity: ident,
        credibility: 0,
        trace: new Map<string, number>(),
      };

      const credibility = CredibilityHeuristic.computeCredibility(
        ident,
        ruleTrace.trace,
      );

      ruleTrace.credibility = credibility;
      ruleTraces.push(ruleTrace);
      credibilities.push(credibility);
    }

    fs.writeFileSync(
      path.resolve(__dirname, `./trace-${name}.json`),
      JSON.stringify(
        ruleTraces.map((ruleTrace) => ({
          ...ruleTrace,
          trace: Object.fromEntries(ruleTrace.trace),
        })),
      ),
    );

    const average = Number(
      credibilities.reduce((a, b) => a + b, 0) / credibilities.length,
    ).toFixed(2);

    const output = `Profile: ${name}\nAverage Credibility: ${average}\nMin: ${Math.min(...credibilities)} Max: ${Math.max(...credibilities)}`;

    console.log(output);
  };

  describe('simulate', () => {
    it('Should run normal user simulation successfully"', () => {
      simulateProfile('normal', generateNormalIdent, 5000);
    });

    it('Should run malicious user simulation successfully"', () => {
      simulateProfile('malicious', generateMaliciousIdent, 5000);
    });

    it('Should run newbie user simulation successfully"', () => {
      simulateProfile('newbie', generateNewbieIdent, 5000);
    });

    it('Should run power user simulation successfully"', () => {
      simulateProfile('power', generatePowerIdent, 5000);
    });
  });
});
