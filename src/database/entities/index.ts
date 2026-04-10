import { AdAccount } from './traffic/ad-account.entity';
import { Campaign } from './traffic/campaign.entity';
import { CampaignDailyPerformance } from './traffic/campaign-daily-performance.entity';
import { AttributionTouch } from './capture/attribution-touch.entity';
import { Capture } from './capture/capture.entity';
import { DedupeMatchLog } from './identity/dedupe-match-log.entity';
import { IdentifierSource } from './identity/identifier-source.entity';
import { IdentifierType } from './identity/identifier-type.entity';
import { Person } from './identity/person.entity';
import { PersonIdentifier } from './identity/person-identifier.entity';
import { Form } from './form/form.entity';
import { FormAnswer } from './form/form-answer.entity';
import { FormResponse } from './form/form-response.entity';
import { FormVersion } from './form/form-version.entity';
import { FormVersionQuestion } from './form/form-version-question.entity';
import { Question } from './form/question.entity';
import { QuestionOption } from './form/question-option.entity';
import { Launch } from './marketing/launch.entity';
import { Platform } from './marketing/platform.entity';
import { Season } from './marketing/season.entity';
import { Strategy } from './marketing/strategy.entity';
import { Temperature } from './marketing/temperature.entity';
import { Leadscore } from './leadscore/leadscore.entity';
import { LeadscoreOptionPoints } from './leadscore/leadscore-option-points.entity';
import { LeadscoreRangePoints } from './leadscore/leadscore-range-points.entity';
import { LeadscoreResult } from './leadscore/leadscore-result.entity';
import { LeadscoreTier } from './leadscore/leadscore-tier.entity';
import { LeadscoreTierRule } from './leadscore/leadscore-tier-rule.entity';
import { Invite } from './system/invite.entity';
import { PasswordReset } from './system/password-reset.entity';
import { User } from './system/user.entity';
import { OAuthConnection } from './integrations/oauth-connection.entity';
import { OAuthState } from './integrations/oauth-state.entity';
import { VotingCampaign } from './voting/voting-campaign.entity';
import { VotingCategory } from './voting/voting-category.entity';
import { VotingCandidate } from './voting/voting-candidate.entity';
import { VotingVoter } from './voting/voting-voter.entity';
import { VotingVote } from './voting/voting-vote.entity';

export const ENTITIES = [
  Person,
  IdentifierType,
  IdentifierSource,
  PersonIdentifier,
  DedupeMatchLog,

  Platform,
  Strategy,
  Temperature,
  Launch,
  Season,

  Form,
  FormVersion,
  Question,
  FormVersionQuestion,
  QuestionOption,
  FormResponse,
  FormAnswer,

  Leadscore,
  LeadscoreOptionPoints,
  LeadscoreRangePoints,
  LeadscoreTier,
  LeadscoreTierRule,
  LeadscoreResult,

  Capture,
  AttributionTouch,

  AdAccount,
  Campaign,
  CampaignDailyPerformance,

  OAuthConnection,
  OAuthState,

  User,
  PasswordReset,
  Invite,

  VotingCampaign,
  VotingCategory,
  VotingCandidate,
  VotingVoter,
  VotingVote,
];
