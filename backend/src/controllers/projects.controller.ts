import { Request, Response } from 'express';
import { fetchProjects, fetchProjectById, fetchFilterOptions, fetchProjectExecutionDetails } from '../services/projects.service.js';
import { getUserDataScope } from '../utils/rbac.js';

export async function getProjects(req: Request, res: Response) {
  try {
    let house = (req.query.house as 'Lok Sabha' | 'Rajya Sabha') || 'Lok Sabha';
    let state = req.query.state as string;
    let district = req.query.district as string;
    let constituency = req.query.constituency as string;
    let mpName = (req.query.mpName || req.query.mp) as string;

    // Strict Backend Data Scope Enforcement if authenticated
    if (req.profile) {
      const scope = getUserDataScope(req.profile);

      if (scope.scope === 'MP') {
        // Enforce MP's assigned house
        house = scope.house;

        // If client attempted to request another MP's records, reject with 403
        if (mpName && mpName.trim().toLowerCase() !== scope.mpName.trim().toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: You are not authorized to view projects for another MP (${mpName}).`,
          });
        }
        mpName = scope.mpName;

        if (scope.constituency) {
          constituency = scope.constituency;
        }
        if (scope.state) {
          state = scope.state;
        }
      } else if (scope.scope === 'DISTRICT') {
        const cleanScopeDist = (scope.district || '').split('(')[0].trim().toLowerCase();
        const cleanReqDist = (district || '').split('(')[0].trim().toLowerCase();
        if (district && cleanReqDist !== cleanScopeDist && district.trim().toLowerCase() !== scope.district.trim().toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: You are not authorized to view projects outside your assigned district (${scope.district}).`,
          });
        }
        if (scope.state && state && state.trim().toLowerCase() !== scope.state.trim().toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: You are not authorized to view projects outside your assigned state (${scope.state}).`,
          });
        }
        district = scope.district;
        if (scope.state) {
          state = scope.state;
        }
      } else if (scope.scope === 'STATE') {
        // If client attempted to request another state, reject with 403
        if (state && state.trim().toLowerCase() !== scope.state.trim().toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: You are not authorized to view projects outside your assigned state (${scope.state}).`,
          });
        }
        state = scope.state;
      }
    }

    const filters = {
      house,
      state,
      district,
      constituency,
      mpName,
      workCategory: (req.query.category || req.query.workCategory) as string,
      status: req.query.status as string,
      financialYear: req.query.financialYear as string,
      tenure: req.query.tenure as string,
      riskLevel: (req.query.riskLevel || req.query.risk) as string,
      isSanctioned: req.query.isSanctioned !== undefined ? req.query.isSanctioned === 'true' : undefined,
      isCompleted: req.query.isCompleted !== undefined ? req.query.isCompleted === 'true' : undefined,
      hasDisbursement: req.query.hasDisbursement !== undefined ? req.query.hasDisbursement === 'true' : undefined,
      search: req.query.search as string,
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
      sortBy: ((req.query.sortBy || req.query.sortField) as string) || 'sanction_amount',
      sortOrder: ((req.query.sortOrder || req.query.sortDir) as 'asc' | 'desc') || 'desc',
    };

    const result = await fetchProjects(filters);

    // If Implementing Agency, filter in-memory to agency works if needed
    if (req.profile && req.profile.role === 'IMPLEMENTING_AGENCY' && req.profile.agency_name) {
      const targetAgency = req.profile.agency_name.toLowerCase();
      result.projects = result.projects.filter(p =>
        (p.ida && p.ida.toLowerCase().includes(targetAgency)) ||
        (p.vendorName && p.vendorName.toLowerCase().includes(targetAgency)) ||
        (p.district && p.district.toLowerCase() === req.profile?.district?.toLowerCase())
      );
      result.totalCount = result.projects.length;
    }

    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getProjectById(req: Request, res: Response) {
  try {
    const workId = req.params.workId;
    let house = (req.query.house as 'Lok Sabha' | 'Rajya Sabha') || 'Lok Sabha';

    if (!workId) {
      return res.status(400).json({ success: false, message: 'workId parameter is required' });
    }

    if (req.profile) {
      const scope = getUserDataScope(req.profile);
      if (scope.scope === 'MP') {
        house = scope.house;
      }
    }

    const project = await fetchProjectById(workId, house);
    if (!project) {
      return res.status(404).json({ success: false, message: `Project ${workId} not found in ${house}` });
    }

    // Strict Cross-Role Access Control on Project Record
    if (req.profile) {
      const scope = getUserDataScope(req.profile);

      if (scope.scope === 'MP') {
        const pMP = (project.mp || '').trim().toLowerCase();
        const sMP = scope.mpName.trim().toLowerCase();
        if (pMP !== sMP && !pMP.includes(sMP) && !sMP.includes(pMP)) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: You are not authorized to view project ${workId} belonging to another MP (${project.mp}).`,
          });
        }
      } else if (scope.scope === 'DISTRICT') {
        const pDist = (project.district || '').trim().toLowerCase();
        const sDist = scope.district.trim().toLowerCase();
        if (pDist !== sDist) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: You are not authorized to view project ${workId} outside your assigned district (${scope.district}).`,
          });
        }
      } else if (scope.scope === 'STATE') {
        const pState = (project.state || '').trim().toLowerCase();
        const sState = scope.state.trim().toLowerCase();
        if (pState !== sState) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: You are not authorized to view project ${workId} outside your assigned state (${scope.state}).`,
          });
        }
      } else if (scope.scope === 'AGENCY') {
        const targetAgency = scope.agency.trim().toLowerCase();
        const ida = (project.ida || '').trim().toLowerCase();
        const vendor = (project.vendorName || '').trim().toLowerCase();
        const dist = (project.district || '').trim().toLowerCase();
        const uDist = (req.profile.district || '').trim().toLowerCase();
        if (!ida.includes(targetAgency) && !vendor.includes(targetAgency) && dist !== uDist) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: You are not authorized to view project ${workId} assigned to another agency.`,
          });
        }
      }
    }

    return res.json({ success: true, data: project });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getFilterOptions(req: Request, res: Response) {
  try {
    let house = (req.query.house as 'Lok Sabha' | 'Rajya Sabha') || 'Lok Sabha';
    let state = req.query.state as string;

    if (req.profile) {
      const scope = getUserDataScope(req.profile);
      if (scope.scope === 'MP') {
        house = scope.house;
        if (scope.state) state = scope.state;
      } else if (scope.scope === 'STATE') {
        state = scope.state;
      } else if (scope.scope === 'DISTRICT' && scope.state) {
        state = scope.state;
      }
    }

    const options = await fetchFilterOptions(house, state);
    return res.json({ success: true, data: options });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getProjectExecutionDetails(req: Request, res: Response) {
  try {
    const workId = req.params.workId;
    const house = (req.query.house as 'Lok Sabha' | 'Rajya Sabha') || 'Lok Sabha';

    if (!workId) {
      return res.status(400).json({ success: false, message: 'workId parameter is required' });
    }

    const details = await fetchProjectExecutionDetails(workId, house);
    return res.json({ success: true, data: details });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

