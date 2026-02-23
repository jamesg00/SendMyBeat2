import React from "react";
import { Youtube, CheckCircle2, AlertCircle, Music, Image as ImageIcon, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".flac", ".ogg"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif"];

const UploadDashboard = ({
  youtubeConnected,
  youtubeName,
  youtubeEmail,
  onDisconnectYouTube,
  onConnectYouTube,
  onExitUploadTab,
  handleAudioUpload,
  handleImageUpload,
  uploadingAudio,
  uploadProgress,
  audioFile,
  uploadingImage,
  imageFile,
  isAudioDragActive,
  setIsAudioDragActive,
  isImageDragActive,
  setIsImageDragActive,
  setStudioOpen
}) => {
  return (
    <Card className="dashboard-card min-h-[400px]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
             <Youtube className="h-5 w-5 text-red-600" />
             New Upload
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => onExitUploadTab?.()}>
            Exit Upload Tab
          </Button>
        </div>
        <CardDescription>Upload audio and image to enter the studio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         <div className={`p-4 rounded-lg flex items-center justify-between ${youtubeConnected ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            <div className="flex items-center gap-3">
               {youtubeConnected ? <CheckCircle2 className="text-green-500 h-5 w-5"/> : <AlertCircle className="text-red-500 h-5 w-5"/>}
               <div>
                  <p className="font-medium text-sm">{youtubeConnected ? `Connected as ${youtubeName}` : "YouTube Disconnected"}</p>
                  {youtubeConnected && <p className="text-xs opacity-70">{youtubeEmail}</p>}
               </div>
            </div>
            <Button size="sm" variant="outline" onClick={youtubeConnected ? onDisconnectYouTube : onConnectYouTube}>
               {youtubeConnected ? "Disconnect" : "Connect"}
            </Button>
         </div>

         <div className="grid md:grid-cols-2 gap-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isAudioDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'}`}
              onDragOver={(e) => { e.preventDefault(); setIsAudioDragActive(true); }}
              onDragLeave={() => setIsAudioDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setIsAudioDragActive(false); handleAudioUpload(e.dataTransfer.files[0]); }}
            >
               <Input type="file" accept={AUDIO_EXTENSIONS.join(',')} className="hidden" id="audio-input" onChange={(e) => handleAudioUpload(e.target.files[0])} />
               <label htmlFor="audio-input" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                     <Music className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="font-medium">Upload Audio</p>
                     <p className="text-xs text-slate-500">MP3, WAV, FLAC</p>
                  </div>
                  {uploadingAudio && <div className="text-xs text-blue-400">Uploading... {uploadProgress}%</div>}
                  {audioFile && <div className="text-xs text-green-500 font-medium break-all">{audioFile.name}</div>}
               </label>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isImageDragActive ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 hover:border-slate-500'}`}
              onDragOver={(e) => { e.preventDefault(); setIsImageDragActive(true); }}
              onDragLeave={() => setIsImageDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setIsImageDragActive(false); handleImageUpload(e.dataTransfer.files[0]); }}
            >
               <Input type="file" accept={IMAGE_EXTENSIONS.join(',')} className="hidden" id="image-input" onChange={(e) => handleImageUpload(e.target.files[0])} />
               <label htmlFor="image-input" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
                     <ImageIcon className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="font-medium">Upload Artwork</p>
                     <p className="text-xs text-slate-500">JPG, PNG, WEBP</p>
                  </div>
                  {uploadingImage && <div className="text-xs text-purple-400">Uploading...</div>}
                  {imageFile && <div className="text-xs text-green-500 font-medium break-all">{imageFile.name}</div>}
               </label>
            </div>
         </div>

         {audioFile && imageFile && (
           <Button onClick={() => setStudioOpen(true)} className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Enter Studio <Wand2 className="ml-2 h-5 w-5" />
           </Button>
         )}
      </CardContent>
    </Card>
  );
};

export default UploadDashboard;
