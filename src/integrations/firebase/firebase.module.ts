import { Global, Module } from '@nestjs/common';
import { firebaseAdminProvider } from './firebase-admin.provider';
import { FcmService } from './fcm.service';

@Global()
@Module({
  providers: [firebaseAdminProvider, FcmService],
  exports: [firebaseAdminProvider, FcmService],
})
export class FirebaseModule {}
