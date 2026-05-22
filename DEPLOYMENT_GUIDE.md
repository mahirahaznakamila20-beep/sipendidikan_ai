# Deployment Guide - Vercel

Panduan lengkap untuk deploy siPENDIdikan AI ke Vercel.

## ✅ Pre-Deployment Checklist

- [ ] Semua dependencies terpasang dengan benar
- [ ] Environment variables sudah dikonfigurasi
- [ ] Database (Supabase) sudah ready
- [ ] Git repository sudah ter-setup
- [ ] `.env` file tidak di-commit (cek .gitignore)

## 🔧 Setup Environment Variables di Vercel

1. **Buka Vercel Dashboard**
   - Go to: https://vercel.com/dashboard

2. **Select Project**
   - Pilih siPENDIdikan AI project

3. **Go to Settings**
   - Settings → Environment Variables

4. **Add Variables**
   Tambahkan semua variabel ini:

   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   GROQ_API_KEY=your-groq-key
   GROQ_API_URL=https://api.groq.com/openai/v1
   JWT_SECRET=your-secret-key-here
   REFRESH_EXPIRE_DAYS=7
   NODE_ENV=production
   ```

5. **Save & Deploy**
   - Environment variables sudah aktif

## 🚀 Deploy Process

### Option 1: Via Vercel Dashboard (Recommended)

1. **Connect GitHub**
   - Vercel dashboard → Import Project
   - Select GitHub repository
   - Authorize Vercel

2. **Configure Project**
   - Framework: Other (Express.js)
   - Build Command: `npm install --legacy-peer-deps || true`
   - Development Command: `npm run dev`
   - Install Command: `npm install --legacy-peer-deps || true`

3. **Deploy**
   - Click "Deploy"
   - Wait for build completion

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production
vercel --prod
```

## 📊 Monitoring Deployment

### Check Build Status

```bash
# View deployment logs
vercel logs --tail

# List recent deployments
vercel list
```

### Troubleshooting

**Build Failed**
```bash
# Check logs for error messages
vercel logs

# Common issues:
# 1. Missing environment variables
# 2. Dependency conflicts
# 3. Port configuration
```

**500 Error on API Calls**
```bash
# Check runtime logs
vercel logs --follow

# Verify:
# - Supabase credentials correct
# - Database migrations applied
# - Groq API key valid
```

**CORS Errors**
```
# Update CORS configuration in backend/app.js
cors({ origin: ['https://your-domain.com', 'http://localhost:3000'] })
```

## 🔍 Post-Deployment Verification

### Test API Endpoints

```bash
# Replace YOUR_DOMAIN with actual Vercel domain

# Health check
curl https://YOUR_DOMAIN/api/health

# Test auth (register)
curl -X POST https://YOUR_DOMAIN/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test",
    "email": "test@example.com",
    "password": "Test1234!",
    "school_npsn": "123456"
  }'

# Test auth (login)
curl -X POST https://YOUR_DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "password": "Test1234!"
  }'
```

### Check Frontend

- Open https://YOUR_DOMAIN
- Verify page loads correctly
- Check browser console for errors

## 🔐 Security Checklist

- [ ] JWT_SECRET is strong and random
- [ ] Environment variables not exposed in logs
- [ ] HTTPS is enforced
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Database backups enabled
- [ ] Error messages don't leak sensitive info

## 📈 Performance Optimization

### Vercel Edge Functions (Optional)

```json
// vercel.json
{
  "functions": {
    "backend/index.js": {
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "regions": ["sin1"]
}
```

### Caching Strategy

Add cache headers untuk static assets:

```javascript
// backend/app.js
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  maxAge: '1h',
  etag: false
}));
```

## 🆘 Common Issues & Solutions

### Issue: "Cannot find module"

**Solution:**
```bash
# Clear cache and rebuild
vercel env pull
npm install --legacy-peer-deps
vercel --prod
```

### Issue: Database connection timeout

**Solution:**
- Check Supabase URL format
- Verify firewall rules
- Check Vercel function timeout

### Issue: 413 Payload Too Large

**Solution:**
```javascript
// backend/app.js
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

### Issue: Function cold start delay

**Solution:**
- Upgrade Vercel plan
- Optimize dependencies
- Use serverless functions efficiently

## 📞 Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Express.js Guide**: https://expressjs.com/
- **GitHub Issues**: Report issues di repository

## 🔄 Continuous Deployment

Vercel automatically deploys when:
- Push ke main branch
- Pull request dibuat
- Manual redeploy dari dashboard

### Disable Auto-Deploy

Settings → Git → Disable Auto-Deploy

### Preview Deployments

Setiap push membuat preview deployment:
- `https://branch-name-xxx.vercel.app`

## 📝 Rollback Procedure

Jika deployment bermasalah:

1. **Via Vercel Dashboard**
   - Deployments → Select previous version
   - Click "Promote to Production"

2. **Via CLI**
   ```bash
   vercel rollback
   ```

---

**Last Updated**: May 22, 2026
**Version**: 1.0.0
