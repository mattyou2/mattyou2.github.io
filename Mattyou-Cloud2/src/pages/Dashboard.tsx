import { useState, useEffect, useRef } from 'react';
import { Cloud, File, HardDrive, Share2, Upload, Trash2, Eye, Loader2, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, File as FileType } from '../lib/supabase';
import FilePreview from '../components/FilePreview';

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const [files, setFiles] = useState<FileType[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Fout bij laden bestanden:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check storage limit
    const currentUsed = profile?.storage_used || 0;
    const limit = profile?.storage_limit || 10737418240;
    if (currentUsed + file.size > limit) {
      alert('Opslaglimiet overschreden! Upgrade je plan voor meer ruimte.');
      return;
    }

    setUploading(true);
    try {
      const storagePath = `${user.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('files').insert({
        user_id: user.id,
        filename: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: storagePath,
      });

      if (dbError) throw dbError;

      await loadFiles();
      await refreshProfile();
      alert('Bestand succesvol geüpload!');
    } catch (error) {
      console.error('Upload fout:', error);
      alert('Upload mislukt.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (file: FileType) => {
    if (!confirm(`Weet je zeker dat je "${file.filename}" wilt verwijderen?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      await loadFiles();
      await refreshProfile();
    } catch (error) {
      console.error('Verwijder fout:', error);
      alert('Kon bestand niet verwijderen.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">Dashboard</h1>
          <p className="text-slate-400">Welkom terug, @{profile?.username}</p>
        </div>
        
        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center transition-all disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Upload className="w-5 h-5 mr-2" />
            )}
            {uploading ? 'Uploaden...' : 'Bestand Uploaden'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center mb-4">
            <HardDrive className="w-6 h-6 text-blue-400 mr-2" />
            <h3 className="text-lg font-semibold text-slate-50">Opslag Gebruikt</h3>
          </div>
          <p className="text-2xl font-bold text-slate-50">{formatBytes(profile?.storage_used || 0)}</p>
          <div className="mt-2 bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-blue-500 h-full" 
              style={{ width: `${((profile?.storage_used || 0) / (profile?.storage_limit || 1)) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Van de {formatBytes(profile?.storage_limit || 10737418240)}
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 text-center flex flex-col justify-center">
          <Share2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-50">{files.length}</p>
          <p className="text-sm text-slate-400">Totaal geüpload</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 text-center flex flex-col justify-center">
          <Cloud className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-50 uppercase">{profile?.plan}</p>
          <p className="text-sm text-slate-400">Huidig Plan</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-slate-50">Mijn Bestanden</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Laden...
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center">
            <File className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-50 mb-2">Nog geen bestanden</h3>
            <p className="text-slate-400 mb-6">Upload je eerste bestand om te beginnen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Naam</th>
                  <th className="px-6 py-4 font-medium">Grootte</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Datum</th>
                  <th className="px-6 py-4 font-medium text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <File className="w-5 h-5 text-blue-400 mr-3" />
                        <span className="text-slate-200 font-medium truncate max-w-xs">{file.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{formatBytes(file.file_size)}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm truncate max-w-[100px]">{file.file_type}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{new Date(file.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setPreviewFile(file)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
                          title="Bekijken"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(file)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewFile && (
        <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}
