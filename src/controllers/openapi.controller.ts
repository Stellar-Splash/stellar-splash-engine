import { Request, Response } from 'express';
import { OpenApiSpecService } from '../services/openapi-spec.service';

export class OpenApiController {
  public static getSpec(_req: Request, res: Response): void {
    const spec = OpenApiSpecService.generateSpec();
    res.json(spec);
  }

  public static renderUiDoc(_req: Request, res: Response): void {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Stellar Splash Engine API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body style="margin: 0; background: #0f172a;">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
      });
    };
  </script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
