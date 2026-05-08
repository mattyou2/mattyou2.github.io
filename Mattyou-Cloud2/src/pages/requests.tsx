import { useState, useEffect } from 'react';
import { Users, Loader, Crown, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';

export default function Requests() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user?.email === 'treurmattheo@gmail.com';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [user, isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (userId: string, newPlan: 'free' | 'plus' | 'premium') => {
    if (!isAdmin) return;
    setUpdating(userId);
    try {
      const storageMap = {
        free: 10737418240,
        plus: 53687091200,
        premium: 1099511627776,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          plan: newPlan,
          plan_updated_at: new Date().toISOString(),
          storage_limit: storageMap[newPlan],
        })
        .eq('id', userId);

      if (error) throw error;

      await loadUsers();
    } catch (error) {
      console.error('Error updating user plan:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getStorageDisplay = (storageLimit: number) => {
    if (storageLimit >= 1099511627776) return '1TB';
    if (storageLimit >= 53687091200) return '50GB';
    return '10GB';
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const planStats = {
    free: users.filter(u => u.plan === 'free').length,
    plus: users.filter(u => u.plan === 'plus').length,
    premium: users.filter(u => u.plan === 'premium').length,
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-slate-50 text-xl font-semibold">Access Denied</p>
          <p className="text-slate-400 mt-2">Only the admin account can access this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-50 mb-3">User Management</h1>
          <p className="text-slate-400 text-lg">Manage accounts and assign subscription tiers</p>
        </div>

        {!loading && users.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-lg border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Free Tier</p>
                  <p className="text-3xl font-bold text-white mt-1">{planStats.free}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-blue-200 opacity-20" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-6 shadow-lg border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Plus Tier</p>
                  <p className="text-3xl font-bold text-white mt-1">{planStats.plus}</p>
                </div>
                <Crown className="w-12 h-12 text-amber-200 opacity-20" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 shadow-lg border border-purple-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Premium Tier</p>
                  <p className="text-3xl font-bold text-white mt-1">{planStats.premium}</p>
                </div>
                <Crown className="w-12 h-12 text-purple-200 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-400 mb-3" />
            <p className="text-slate-400">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-12 text-center shadow-lg">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-50 text-lg font-medium">No users found</p>
            <p className="text-slate-400 mt-2">Users will appear here once they create accounts</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-50 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredUsers.map((userItem) => (
                <div
                  key={userItem.id}
                  className="bg-slate-900 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-50">@{userItem.username}</h3>
                        {userItem.plan === 'free' && (
                          <span className="px-2.5 py-1 bg-blue-950 text-blue-300 rounded-full text-xs font-medium">
                            Free
                          </span>
                        )}
                        {userItem.plan === 'plus' && (
                          <span className="px-2.5 py-1 bg-amber-950 text-amber-300 rounded-full text-xs font-medium flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Plus
                          </span>
                        )}
                        {userItem.plan === 'premium' && (
                          <span className="px-2.5 py-1 bg-purple-950 text-purple-300 rounded-full text-xs font-medium flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Premium
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        Joined {new Date(userItem.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-400">{getStorageDisplay(userItem.storage_limit)}</p>
                      <p className="text-xs text-slate-400">Storage</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-700">
                    <button
                      onClick={() => handlePlanChange(userItem.id, 'free')}
                      disabled={updating === userItem.id || userItem.plan === 'free'}
                      className="px-3 py-2 bg-blue-950 hover:bg-blue-900 text-blue-300 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Free
                    </button>
                    <button
                      onClick={() => handlePlanChange(userItem.id, 'plus')}
                      disabled={updating === userItem.id || userItem.plan === 'plus'}
                      className="px-3 py-2 bg-amber-950 hover:bg-amber-900 text-amber-300 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Plus
                    </button>
                    <button
                      onClick={() => handlePlanChange(userItem.id, 'premium')}
                      disabled={updating === userItem.id || userItem.plan === 'premium'}
                      className="px-3 py-2 bg-purple-950 hover:bg-purple-900 text-purple-300 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Premium
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
