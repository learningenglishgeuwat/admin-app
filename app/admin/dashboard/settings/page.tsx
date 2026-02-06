'use client'

import { useEffect, useState } from 'react'
import { Database } from 'lucide-react'

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('system')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      setError(null)
      // Mock load (simulate async)
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    // Mock save (simulate async)
    await new Promise(resolve => setTimeout(resolve, 400))
    setSaving(false)
  }

  return (
    <div className="settings-content">

          {/* Settings Navigation */}
          <div className="tab-navigation">
            <div className="tab-container">
              <button
                onClick={() => setActiveSection('system')}
                className={`tab-btn ${activeSection === 'system' ? 'tab-active' : 'tab-inactive'}`}
              >
                <Database className="w-4 h-4" />
                System Settings
              </button>
            </div>
          </div>

          {/* Settings Content */}
          <div className="tab-content">
            {/* System Settings */}
            {activeSection === 'system' && (
              <div>
                <h3 className="tab-section-title">
                  <Database className="tab-section-icon" />
                  System Configuration
                </h3>
                
                {error && (
                  <div className="dashboard-card">
                    <p className="text-red-400">{error}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {/* System Information */}
                  <div className="futuristic-card">
                    <h4 className="text-lg font-medium text-white mb-4">System Information</h4>
                    <div className="dashboard-grid">
                      <div>
                        <p className="text-sm text-gray-400">Application Version</p>
                        <p className="text-white">v1.0.0</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Environment</p>
                        <p className="text-white">Production</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Database Status</p>
                        <p className="text-green-400">Connected</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Last Backup</p>
                        <p className="text-white">2024-01-27 02:00:00</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
    </div>
  )
}
