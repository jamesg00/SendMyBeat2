#!/usr/bin/env python3
"""
Generate secure secret keys for SendMyBeat application
Run this script to generate new JWT_SECRET_KEY and SESSION_SECRET_KEY
"""

import secrets

print("=" * 70)
print("SendMyBeat - Secret Key Generator")
print("=" * 70)
print()

# Generate JWT Secret Key (64 bytes = 512 bits)
jwt_secret = secrets.token_urlsafe(64)
print("JWT_SECRET_KEY (for authentication tokens):")
print(jwt_secret)
print()

# Generate Session Secret Key (64 bytes = 512 bits)
session_secret = secrets.token_urlsafe(64)
print("SESSION_SECRET_KEY (for session encryption):")
print(session_secret)
print()

print("=" * 70)
print("COPY THESE TO YOUR /app/backend/.env FILE:")
print("=" * 70)
print()
print(f"JWT_SECRET_KEY={jwt_secret}")
print(f"SESSION_SECRET_KEY={session_secret}")
print()
print("⚠️  SECURITY NOTES:")
print("   • Keep these keys secret - never commit to git")
print("   • Different keys for dev/staging/production")
print("   • Rotate keys periodically for better security")
print("   • If keys are compromised, generate new ones immediately")
print()
