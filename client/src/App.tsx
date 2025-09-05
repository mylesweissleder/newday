function App() {
    // const { user, loading } = useAuth()

    // if (loading) {
    //   return (
    //     <div className="min-h-screen bg-gray-50 flex items-center 
  justify-center">
    //       <LoadingSpinner size="lg" />
    //     </div>
    //   )
    // }

    return (
      <SiteAccessGate>
        {/* {!user ? ( */}
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        {/* ) : (
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />}
   />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/contacts/:id" element={<ContactDetailPage />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/:id" element={<CampaignDetailPage />}
  />
              <Route path="/outreach" element={<OutreachPage />} />
              <Route path="/network" element={<NetworkPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />}
   />
            </Routes>
          </Layout>
        )} */}
      </SiteAccessGate>
    )
}
