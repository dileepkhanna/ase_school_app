// import { Inject, Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import * as admin from 'firebase-admin';
// import { FIREBASE_ADMIN } from './firebase-admin.provider';

// export type PushPayload = {
//   title: string;
//   body?: string;
//   imageUrl?: string;
//   data?: Record<string, string>;
// };

// @Injectable()
// export class FcmService {
//   constructor(
//     @Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App | null,
//     private readonly config: ConfigService,
//   ) {}

//   isEnabled(): boolean {
//     return !!this.firebaseApp;
//   }

//   /**
//    * Sends push notification to a single device token.
//    */
//   async sendToToken(token: string, payload: PushPayload): Promise<void> {
//     if (!this.firebaseApp) return;

//     const message: admin.messaging.Message = {
//       token,
//       notification: {
//         title: payload.title,
//         body: payload.body ?? '',
//         imageUrl: payload.imageUrl,
//       },
//       data: payload.data ?? {},
//       android: {
//         priority: 'high',
//       },
//       apns: {
//         payload: {
//           aps: {
//             sound: 'default',
//           },
//         },
//       },
//     };

//     try {
//       await this.firebaseApp.messaging().send(message);
//     } catch (err: any) {
//       // eslint-disable-next-line no-console
//       console.error('❌ FCM sendToToken failed:', err?.message ?? err);
//     }
//   }

//   /**
//    * Sends push notification to multiple device tokens.
//    * (FCM limit is 500 tokens per batch)
//    */
//   async sendToTokens(tokens: string[], payload: PushPayload): Promise<void> {
//     if (!this.firebaseApp) return;
//     const unique = Array.from(new Set(tokens)).filter((t) => !!t);

//     const chunks: string[][] = [];
//     for (let i = 0; i < unique.length; i += 500) {
//       chunks.push(unique.slice(i, i + 500));
//     }

//     for (const chunk of chunks) {
//       const message: admin.messaging.MulticastMessage = {
//         tokens: chunk,
//         notification: {
//           title: payload.title,
//           body: payload.body ?? '',
//           imageUrl: payload.imageUrl,
//         },
//         data: payload.data ?? {},
//         android: { priority: 'high' },
//         apns: {
//           payload: { aps: { sound: 'default' } },
//         },
//       };

//       try {
//         await this.firebaseApp.messaging().sendEachForMulticast(message);
//       } catch (err: any) {
//         // eslint-disable-next-line no-console
//         console.error('❌ FCM sendToTokens failed:', err?.message ?? err);
//       }
//     }
//   }
// }








import { Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from './firebase-admin.provider';

export type PushPayload = {
  title: string;
  body?: string;
  imageUrl?: string;
  data?: Record<string, string>;
};

@Injectable()
export class FcmService {
  constructor(@Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App | null) {}

  isEnabled(): boolean {
    return !!this.firebaseApp;
  }

  /**
   * Sends push notification to a single device token.
   */
  async sendToToken(token: string, payload: PushPayload): Promise<void> {
    if (!this.firebaseApp) return;

    const message: admin.messaging.Message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body ?? '',
        imageUrl: payload.imageUrl,
      },
      data: payload.data ?? {},
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    };

    try {
      await this.firebaseApp.messaging().send(message);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('❌ FCM sendToToken failed:', err?.message ?? err);
    }
  }

  /**
   * Sends push notification to multiple device tokens.
   * (FCM limit is 500 tokens per batch)
   */
  async sendToTokens(tokens: string[], payload: PushPayload): Promise<void> {
    if (!this.firebaseApp) return;

    const unique = Array.from(new Set(tokens)).filter((t) => !!t);

    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += 500) {
      chunks.push(unique.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const message: admin.messaging.MulticastMessage = {
        tokens: chunk,
        notification: {
          title: payload.title,
          body: payload.body ?? '',
          imageUrl: payload.imageUrl,
        },
        data: payload.data ?? {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      };

      try {
        await this.firebaseApp.messaging().sendEachForMulticast(message);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('❌ FCM sendToTokens failed:', err?.message ?? err);
      }
    }
  }
}
