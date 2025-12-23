import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  // IMPORTANT:
  // - If you use app.setGlobalPrefix('api'), then set useGlobalPrefix:true below.
  // - Then swagger URL becomes: /api/<SWAGGER_PATH>

  const swaggerPathRaw = process.env.SWAGGER_PATH ?? 'docs';
  const swaggerPath = swaggerPathRaw.replace(/^\/+/, '').replace(/\/+$/, '');

  const title = process.env.SWAGGER_TITLE ?? 'ASE School API';
  const description = process.env.SWAGGER_DESCRIPTION ?? 'ASE School Backend API';
  const version = process.env.APP_VERSION ?? process.env.npm_package_version ?? '1.0.0';

  const config = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header', name: 'Authorization' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(swaggerPath, app, document, {
    useGlobalPrefix: true,
    swaggerOptions: { persistAuthorization: true },
  });
}
