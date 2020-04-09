import { EdgeWalletInfo } from '../../types/types'
import { EdgeBox } from '../../util/crypto/crypto'
import { EdgeSnrp } from '../scrypt/scrypt-pixie'

/**
 * Data sent back by the auth server.
 */
export interface LoginReply {
  appId: string
  loginAuthBox?: EdgeBox
  loginId: string

  // 2-factor:
  otpKey?: string
  otpResetDate?: string
  otpTimeout?: number

  // Offline password logins:
  passwordAuthBox?: EdgeBox
  passwordAuthSnrp?: EdgeSnrp
  passwordBox?: EdgeBox
  passwordKeySnrp?: EdgeSnrp

  // PIN login:
  pin2Box?: EdgeBox
  pin2KeyBox?: EdgeBox
  pin2TextBox?: EdgeBox

  // Recovery login:
  question2Box?: EdgeBox
  recovery2Box?: EdgeBox
  recovery2KeyBox?: EdgeBox

  // Resources:
  children?: LoginReply[]
  keyBoxes?: EdgeBox[]
  mnemonicBox?: EdgeBox
  parentBox?: EdgeBox
  rootKeyBox?: EdgeBox
  syncKeyBox?: EdgeBox
}

/**
 * The login data we store on disk.
 */
export interface LoginStash {
  // Basic account info:
  appId?: string // Not actually optional
  loginAuthBox?: EdgeBox
  loginId?: string // Not actually optional
  userId?: string
  username?: string

  // 2-factor:
  otpKey?: string
  otpResetDate?: string
  otpTimeout?: number

  // Offline password logins:
  passwordAuthBox?: EdgeBox
  passwordAuthSnrp?: EdgeSnrp
  passwordBox?: EdgeBox
  passwordKeySnrp?: EdgeSnrp

  // PIN login:
  pin2Key?: string
  pin2TextBox?: EdgeBox

  // Recovery login:
  recovery2Key?: string

  // Resources:
  children?: LoginStash[]
  keyBoxes?: EdgeBox[]
  mnemonicBox?: EdgeBox
  parentBox?: EdgeBox
  rootKeyBox?: EdgeBox
  syncKeyBox?: EdgeBox
}

// Login data decrypted into memory.
export interface LoginTree {
  appId: string
  loginAuth?: Uint8Array
  loginId: string
  loginKey: Uint8Array
  userId: string
  username?: string

  // 2-factor:
  otpKey?: string
  otpResetDate?: string
  otpTimeout?: number

  // Login methods:
  passwordAuth?: Uint8Array
  pin?: string
  pin2Key?: Uint8Array
  recovery2Key?: Uint8Array

  // Resources:
  keyInfos: EdgeWalletInfo[]
  children: LoginTree[]
}

export interface AppIdMap {
  [walletId: string]: string[]
}

export interface LoginKit {
  loginId: string
  login: any
  server?: any
  serverMethod?: string
  serverPath: string
  stash: LoginStash
}

export interface WalletInfoMap {
  [walletId: string]: EdgeWalletInfo
}
