import { Mnemonic } from "@anoma-apps/seed-management";
import { LocalStorageKeys } from "App/types";
import { aesDecrypt, aesEncrypt } from "utils/helpers";

const { REACT_APP_SECRET_KEY = "" } = process.env;

type SessionType = {
  secret: string;
  timestamp: number;
};

const DEFAULT_SESSION_TTL = 3600000; // One hour

class Session {
  private _key = REACT_APP_SECRET_KEY;
  private _seed: string;
  private _session: SessionType | undefined;
  private _timeout: number;

  constructor(timeout?: number) {
    this._seed = window.localStorage.getItem(LocalStorageKeys.MasterSeed) || "";
    this._timeout = timeout || DEFAULT_SESSION_TTL;
  }

  public async getSeed(): Promise<string | undefined> {
    if (this._session && this._seed) {
      const mnemonic = await Mnemonic.fromStorageValue(
        this._session.secret,
        this._seed
      );
      return mnemonic.phrase;
    }
  }

  public get encryptedSeed(): string {
    return this._seed;
  }

  public async setSeed(seed: string): Promise<Session> {
    const secret = this._session?.secret;
    if (secret) {
      this._seed = await new Mnemonic(seed).toStorageValue(secret);
      window.localStorage.setItem(LocalStorageKeys.MasterSeed, this._seed);
    }

    return this;
  }

  public getSession(): SessionType | undefined {
    const sessionString =
      window.sessionStorage.getItem(LocalStorageKeys.Session) || "";

    if (sessionString) {
      const session = JSON.parse(aesDecrypt(sessionString, this._key));
      const { timestamp } = session;

      if (new Date().getTime() - timestamp > this._timeout) {
        window.sessionStorage.removeItem(LocalStorageKeys.Session);
      } else {
        this._session = session;
        return this._session;
      }
    }
  }

  public setSession(secret: string): Session {
    const session = {
      secret,
      timestamp: new Date().getTime(),
    };
    this._session = session;

    window.sessionStorage.setItem(
      LocalStorageKeys.Session,
      aesEncrypt(JSON.stringify(session), this._key)
    );

    return this;
  }

  public static logout(callback: () => void): void {
    window.sessionStorage.removeItem(LocalStorageKeys.Session);
    callback();
    window.location.reload();
  }
}

export default Session;
