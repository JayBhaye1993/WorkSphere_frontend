export interface LoginRequest {
  email:    string;
  password: string;
}

export interface RegisterRequest {
  fullName:    string;
  companyName: string;
  email:       string;
  password:    string;
}

export interface AuthToken {
  accessToken:       string;
  refreshToken:      string;
  accessTokenExpiry: string;
  user:              UserProfile;
}

export interface UserProfile {
  id:              string;
  tenantId:        string;
  email:           string;
  fullName:        string;
  roles:           string[];
  isActive:        boolean;
  isEmailVerified: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
