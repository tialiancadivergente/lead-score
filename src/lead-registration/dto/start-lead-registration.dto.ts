import { ApiProperty } from '@nestjs/swagger';
import { LeadRegistrationPayloadDto } from './lead-registration-payload.dto';

export class StartLeadRegistrationDto {
  @ApiProperty({
    description:
      'Payload do lead para enfileiramento e processamento em background.',
    type: LeadRegistrationPayloadDto,
    example: {
      email: 'teste@gmail.com',
      telefone: '+5554999889988',
      launch: 'ofrr',
      season: 'nov25',
      tag_id: '120566',
      page: 'oresgatedosotimistas.com.br',
      path: '/oro-v1-f/',
      utm_source: 'GGAds_',
      utm_medium: '23516292959',
      utm_campaign: '',
      utm_content: '795195358998',
      utm_term: '191765516639',
      utm_id: '',
      utms: {
        gc_id: '23516292959',
        h_ad_id: '795195358998',
        utm_source: 'GGAds_',
        utm_medium: '23516292959',
        utm_term: '191765516639',
        utm_content: '795195358998',
        target: '',
        sck: 'GGAds_-23516292959-191765516639-795195358998',
        url: 'https://workshopofrr.com.br/ofrr-v3-h1-16-f/?gc_id=23516292959&h_ad_id=795195358998',
        gad_source: '2',
        gad_campaignid: '23516292959',
        gclid:
          'CjwKCAiA1obMBhAbEiwAsUBbIuABR19mqwoXYEZjKuCpKtTkzCD4hPmnR4kj2v50E_ZB8WYS9HmvFBoC0gcQAvD_BwE',
      },
      metadados: {
        url: 'https://workshopofrr.com.br/ofrr-v3-h1-16-f/?gc_id=23516292959&h_ad_id=795195358998',
        referer: 'https://google.com.br',
        ip: '',
        user_agent: '',
        cookies: {
          _fbc: 'fb.2.1768867298132.fbclid',
          _fbp: 'fb.2.1768867298132.725093968551585835',
          _gcl_au: '1.1.1213485897.1763470977',
          _gcl_aw: 'GCL.1213485897.gclid',
          _ga: 'GA1.1.1589424157.1768867297',
          ttclid: '01JYZ2YCB6BTMZYM9Q4KHG1KXX_.tt.2',
        },
        temperature: 'm',
        form_version_id: '12345678-1234-4567-890a-bcdef1234567',
      },
    },
  })
  payload!: LeadRegistrationPayloadDto;
}
