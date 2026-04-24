import { authGuard } from "../../../auth/core/guards/auth.guard";
import { roleGuard } from "../../../auth/core/guards/role.guard";
import { AgentDashboard } from "./agent-dashboard/agent-dashboard";
import { ZoneCompetenceAgent } from "./zone-competence-agent/zone-competence-agent";

export const AGENT_VERIFICATION_ROUTES = [
  {
    path: '',
    component: AgentDashboard,
    title: 'Vérifications des annonces',
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['Agent']
    }
  },
  {
    path: 'administration/zones-de-competence',
    component: ZoneCompetenceAgent,
    canActivate: [authGuard, roleGuard],
    title: 'Zone de compétence agents',
    data: {
      roles: ['Admin']
    }
  }
];