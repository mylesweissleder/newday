import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  LinearProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  TrendingUp,
  NetworkCheck,
  PersonAdd,
  BusinessCenter,
  Phone,
  Email,
  LinkedIn,
  CheckCircle,
  Cancel,
  Schedule,
  ExpandMore,
  Refresh,
  Analytics,
  FilterList,
  Star,
  StarOutline
} from '@mui/icons-material';

interface OpportunityDashboard {
  summary: {
    totalOpportunities: number;
    highPriorityCount: number;
    urgentCount: number;
    completedThisMonth: number;
    averageConfidenceScore: number;
  };
  categories: {
    introductions: number;
    reconnections: number;
    businessMatches: number;
    networkGaps: number;
    strategicMoves: number;
  };
  trends: {
    newThisWeek: number;
    trendDirection: 'up' | 'down' | 'stable';
    successRate: number;
  };
  topOpportunities: UnifiedOpportunitySuggestion[];
  networkHealth: {
    overallScore: number;
    diversityScore: number;
    activityScore: number;
    influenceScore: number;
  };
}

interface UnifiedOpportunitySuggestion {
  id?: string;
  title: string;
  description: string;
  category: OpportunityCategory;
  type: OpportunityType;
  priority: OpportunityPriority;
  confidenceScore: number;
  impactScore: number;
  effortScore: number;
  urgencyScore: number;
  suggestedAt: Date;
  bestTiming?: Date;
  expiresAt?: Date;
  aiReasoning: {
    summary: string;
    keyFactors: string[];
    evidenceFactors: string[];
    riskFactors?: string[];
    successIndicators: string[];
  };
  primaryContact?: {
    id: string;
    name: string;
    company?: string;
    position?: string;
  };
  secondaryContact?: {
    id: string;
    name: string;
    company?: string;
    position?: string;
  };
  relatedContacts?: Array<{
    id: string;
    name: string;
    role: string;
    importance: number;
  }>;
  suggestedActions: OpportunityAction[];
  sourceEngine: 'introduction' | 'reconnection' | 'business_match' | 'network_gap';
  metadata: any;
}

interface OpportunityAction {
  action: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  effort: number;
  timeline: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  requirements: string[];
  estimatedOutcome?: string;
}

type OpportunityCategory = 'INTRODUCTION' | 'RECONNECTION' | 'BUSINESS_MATCH' | 'NETWORK_EXPANSION' | 'STRATEGIC_MOVE' | 'EVENT_DRIVEN' | 'FOLLOW_UP';
type OpportunityType = 'WARM_INTRODUCTION' | 'COLD_OUTREACH' | 'RECONNECT' | 'BUSINESS_PROPOSAL' | 'PARTNERSHIP' | 'CLIENT_REFERRAL' | 'JOB_OPPORTUNITY' | 'INVESTMENT_OPPORTUNITY' | 'KNOWLEDGE_EXCHANGE' | 'EVENT_INVITATION';
type OpportunityPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const OpportunityDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<OpportunityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedOpportunity, setExpandedOpportunity] = useState<string | null>(null);
  const [filterDialog, setFilterDialog] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    opportunity: UnifiedOpportunitySuggestion | null;
  }>({ open: false, opportunity: null });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://network-crm-api.onrender.com/api/opportunities/dashboard?accountId=user-account-id', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      
      const data = await response.json();
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOpportunityAction = async (
    opportunityId: string,
    action: 'accept' | 'dismiss' | 'complete',
    notes?: string
  ) => {
    try {
      await fetch(`https://network-crm-api.onrender.com/api/opportunities/${opportunityId}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'current-user-id',
          notes
        })
      });
      
      // Refresh dashboard
      fetchDashboard();
    } catch (err) {
      setError('Failed to update opportunity');
    }
  };

  const getPriorityColor = (priority: OpportunityPriority) => {
    switch (priority) {
      case 'URGENT': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'default';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: OpportunityCategory) => {
    switch (category) {
      case 'INTRODUCTION': return <PersonAdd />;
      case 'RECONNECTION': return <Phone />;
      case 'BUSINESS_MATCH': return <BusinessCenter />;
      case 'NETWORK_EXPANSION': return <NetworkCheck />;
      case 'STRATEGIC_MOVE': return <TrendingUp />;
      default: return <Star />;
    }
  };

  const formatTimeline = (timeline: string) => {
    switch (timeline) {
      case 'immediate': return 'Now';
      case 'short_term': return '1-2 weeks';
      case 'medium_term': return '1-3 months';
      case 'long_term': return '3+ months';
      default: return timeline;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={fetchDashboard} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!dashboard) return null;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Opportunity Dashboard
        </Typography>
        <Box>
          <IconButton onClick={() => setFilterDialog(true)}>
            <FilterList />
          </IconButton>
          <Button
            startIcon={<Refresh />}
            onClick={fetchDashboard}
            sx={{ ml: 1 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Total Opportunities
              </Typography>
              <Typography variant="h4">
                {dashboard.summary.totalOpportunities}
              </Typography>
              <Box mt={1}>
                <Chip
                  icon={
                    dashboard.trends.trendDirection === 'up' ? (
                      <TrendingUp />
                    ) : dashboard.trends.trendDirection === 'down' ? (
                      <Cancel />
                    ) : (
                      <Schedule />
                    )
                  }
                  label={`${dashboard.trends.newThisWeek} this week`}
                  size="small"
                  color={
                    dashboard.trends.trendDirection === 'up'
                      ? 'success'
                      : dashboard.trends.trendDirection === 'down'
                      ? 'error'
                      : 'default'
                  }
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                High Priority
              </Typography>
              <Typography variant="h4" color="warning.main">
                {dashboard.summary.highPriorityCount}
              </Typography>
              <Typography variant="body2" color="textSecondary" mt={1}>
                {dashboard.summary.urgentCount} urgent
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" color="success.main">
                {dashboard.summary.completedThisMonth}
              </Typography>
              <Typography variant="body2" color="textSecondary" mt={1}>
                {dashboard.trends.successRate}% success rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Confidence
              </Typography>
              <Typography variant="h4">
                {Math.round(dashboard.summary.averageConfidenceScore * 100)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={dashboard.summary.averageConfidenceScore * 100}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Network Health
              </Typography>
              <Typography variant="h4" color="info.main">
                {dashboard.networkHealth.overallScore}
              </Typography>
              <Typography variant="body2" color="textSecondary" mt={1}>
                Diversity: {dashboard.networkHealth.diversityScore}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Category Breakdown */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Opportunities by Category" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Box textAlign="center">
                <PersonAdd color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">{dashboard.categories.introductions}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Introductions
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Box textAlign="center">
                <Phone color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">{dashboard.categories.reconnections}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Reconnections
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Box textAlign="center">
                <BusinessCenter color="warning" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">{dashboard.categories.businessMatches}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Business Matches
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Box textAlign="center">
                <NetworkCheck color="info" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">{dashboard.categories.networkGaps}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Network Gaps
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Box textAlign="center">
                <TrendingUp color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">{dashboard.categories.strategicMoves}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Strategic Moves
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Top Opportunities */}
      <Card>
        <CardHeader 
          title="Top Opportunities" 
          action={
            <Button 
              startIcon={<Analytics />}
              onClick={() => window.open('/opportunities/analytics', '_blank')}
            >
              View Analytics
            </Button>
          }
        />
        <CardContent>
          {dashboard.topOpportunities.map((opportunity, index) => (
            <Accordion
              key={`${opportunity.title}-${index}`}
              expanded={expandedOpportunity === `${opportunity.title}-${index}`}
              onChange={() => 
                setExpandedOpportunity(
                  expandedOpportunity === `${opportunity.title}-${index}` 
                    ? null 
                    : `${opportunity.title}-${index}`
                )
              }
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" width="100%">
                  <Box mr={2}>
                    {getCategoryIcon(opportunity.category)}
                  </Box>
                  <Box flex={1}>
                    <Typography variant="h6" component="div">
                      {opportunity.title}
                    </Typography>
                    <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                      <Chip
                        label={opportunity.priority}
                        size="small"
                        color={getPriorityColor(opportunity.priority)}
                      />
                      <Chip
                        label={`${Math.round(opportunity.confidenceScore * 100)}% confidence`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${opportunity.impactScore} impact`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body2" color="textSecondary">
                      {opportunity.primaryContact?.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {opportunity.primaryContact?.company}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="body1" paragraph>
                      {opportunity.description}
                    </Typography>
                    
                    <Typography variant="h6" gutterBottom>
                      AI Reasoning
                    </Typography>
                    <Typography variant="body2" paragraph color="textSecondary">
                      {opportunity.aiReasoning.summary}
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Key Factors:
                    </Typography>
                    <Box mb={2}>
                      {opportunity.aiReasoning.keyFactors.map((factor, idx) => (
                        <Chip key={idx} label={factor} size="small" sx={{ mr: 1, mb: 1 }} />
                      ))}
                    </Box>
                    
                    <Typography variant="h6" gutterBottom>
                      Suggested Actions
                    </Typography>
                    {opportunity.suggestedActions.map((action, idx) => (
                      <Card key={idx} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="start">
                            <Box>
                              <Typography variant="subtitle1">{action.action}</Typography>
                              <Typography variant="body2" color="textSecondary" paragraph>
                                {action.description}
                              </Typography>
                              <Typography variant="body2">
                                Effort: {action.effort}/10 | Timeline: {formatTimeline(action.timeline)}
                              </Typography>
                            </Box>
                            <Chip 
                              label={action.priority} 
                              size="small" 
                              color={getPriorityColor(action.priority as OpportunityPriority)} 
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardHeader title="Quick Actions" />
                      <CardContent>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          startIcon={<CheckCircle />}
                          onClick={() => {
                            if (opportunity.id) {
                              handleOpportunityAction(opportunity.id, 'accept');
                            }
                          }}
                          sx={{ mb: 1 }}
                        >
                          Accept & Start
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<Email />}
                          sx={{ mb: 1 }}
                          onClick={() => 
                            setActionDialog({ 
                              open: true, 
                              opportunity 
                            })
                          }
                        >
                          Take Action
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => {
                            if (opportunity.id) {
                              handleOpportunityAction(opportunity.id, 'dismiss', 'Not interested');
                            }
                          }}
                        >
                          Dismiss
                        </Button>
                      </CardContent>
                    </Card>
                    
                    {opportunity.primaryContact && (
                      <Card variant="outlined" sx={{ mt: 2 }}>
                        <CardHeader title="Contact Info" />
                        <CardContent>
                          <Typography variant="subtitle2">
                            {opportunity.primaryContact.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {opportunity.primaryContact.position}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {opportunity.primaryContact.company}
                          </Typography>
                        </CardContent>
                      </Card>
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, opportunity: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Take Action: {actionDialog.opportunity?.title}
        </DialogTitle>
        <DialogContent>
          {actionDialog.opportunity?.suggestedActions.map((action, idx) => (
            <Card key={idx} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6">{action.action}</Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {action.description}
                </Typography>
                <Box display="flex" gap={2} mt={2}>
                  <Button variant="contained" startIcon={<Email />}>
                    Send Email
                  </Button>
                  <Button variant="outlined" startIcon={<LinkedIn />}>
                    LinkedIn
                  </Button>
                  <Button variant="outlined" startIcon={<Phone />}>
                    Schedule Call
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, opportunity: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OpportunityDashboard;