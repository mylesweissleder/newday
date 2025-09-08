import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import OpportunityDashboard from '../components/OpportunityDashboard';

const OpportunitiesPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box mb={3}>
        <Typography variant="h3" component="h1" gutterBottom>
          AI Opportunity Suggestions
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          Discover proactive networking opportunities powered by AI analysis of your network relationships, timing patterns, and strategic business connections.
        </Typography>
      </Box>
      
      <OpportunityDashboard />
    </Container>
  );
};

export default OpportunitiesPage;