import type { Locale } from '@/lib/i18n/types';

/**
 * Terms and Privacy content.
 *
 * App Store Connect requires a reachable privacy policy URL before a build can
 * be submitted, and Guideline 1.2 requires terms in which users agree that
 * objectionable content and abusive behaviour are not tolerated. Both are
 * covered here.
 *
 * FILL THESE IN BEFORE LAUNCH. They are env-driven so the legal entity can be
 * set once, per environment, without editing this file:
 *   NEXT_PUBLIC_LEGAL_ENTITY   registered company or sole-trader name
 *   NEXT_PUBLIC_LEGAL_ADDRESS  registered address
 *   NEXT_PUBLIC_LEGAL_EMAIL    contact address a real person reads
 *
 * This is a working draft written to be accurate about what the code actually
 * does. It is not legal advice and should be reviewed by a lawyer before
 * launch, particularly the Georgian data-protection and consumer clauses.
 */

const ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY?.trim() || 'TODO-LEGAL-ENTITY';
const ADDRESS = process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() || 'TODO-ADDRESS';
const EMAIL = process.env.NEXT_PUBLIC_LEGAL_EMAIL?.trim() || 'TODO@example.com';

export const LEGAL_UPDATED = '2026-11-05';

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDoc = {
  title: string;
  updated: string;
  lead: string;
  sections: LegalSection[];
};

/* ========================================================================= */
/* TERMS                                                                      */
/* ========================================================================= */

function termsKa(app: string): LegalDoc {
  return {
    title: 'მომსახურების პირობები',
    updated: LEGAL_UPDATED,
    lead: `${app}-ით სარგებლობა ნიშნავს, რომ ეთანხმები ქვემოთ აღწერილ პირობებს. თუ არ ეთანხმები, გთხოვთ, არ ისარგებლო აპლიკაციით.`,
    sections: [
      {
        heading: 'ვინ ვართ',
        paragraphs: [
          `${app}-ს ოპერირებს ${ENTITY} (მისამართი: ${ADDRESS}). კითხვებისთვის მოგვწერე: ${EMAIL}.`,
        ],
      },
      {
        heading: 'ასაკობრივი შეზღუდვა',
        paragraphs: [
          'სერვისი განკუთვნილია მხოლოდ 18 წლისა და უფროსი ასაკის პირებისთვის. რეგისტრაციისას ადასტურებ, რომ ხარ სულ მცირე 18 წლის.',
          'თუ გვეცოდინება, რომ მომხმარებელი არასრულწლოვანია, ანგარიში დაუყოვნებლივ წაიშლება.',
        ],
      },
      {
        heading: 'შენი ანგარიში',
        bullets: [
          'პასუხისმგებელი ხარ შენი პაროლის უსაფრთხოებაზე.',
          'ერთ ადამიანს შეუძლია ჰქონდეს მხოლოდ ერთი ანგარიში.',
          'არ გადასცე ანგარიში სხვას და არ იმოქმედო სხვისი სახელით.',
          'პროფილში მითითებული ინფორმაცია უნდა იყოს შენი და შეესაბამებოდეს სინამდვილეს.',
        ],
      },
      {
        heading: 'ქცევის წესები — ნულოვანი ტოლერანტობა',
        paragraphs: [
          'აკრძალული შიგთავსისა და შეურაცხმყოფელი ქცევის მიმართ მოქმედებს ნულოვანი ტოლერანტობის პოლიტიკა. ასეთი ქცევა იწვევს ანგარიშის დაბლოკვას გაფრთხილების გარეშე.',
        ],
        bullets: [
          'სხვისი ფოტოს ან ვინაობის გამოყენება.',
          'შევიწროება, მუქარა, სიძულვილის ენა, დისკრიმინაცია — მათ შორის სექსუალური ორიენტაციის ან გენდერული იდენტობის ნიშნით.',
          'არასრულწლოვნის გამოსახულება ნებისმიერი ფორმით.',
          'სხვისი პირადი ინფორმაციის გავრცელება მისი ნებართვის გარეშე.',
          'სპამი, თაღლითობა, ფინანსური მოტყუება, ფიშინგი.',
          'ძალადობრივი ან უკანონო შიგთავსი.',
          'პროფილის ფოტოებში გენიტალიების ან სქესობრივი აქტის გამოსახვა.',
        ],
      },
      {
        heading: 'კომერციული სექსუალური მომსახურება აკრძალულია',
        paragraphs: [
          'პლატფორმა განკუთვნილია პირადი გაცნობისთვის. აკრძალულია სექსუალური მომსახურების შეთავაზება, მოთხოვნა ან რეკლამირება ანაზღაურების სანაცვლოდ, ასევე ნებისმიერი ესკორტ-სერვისის პოპულარიზაცია.',
          'ასეთი ანგარიშები იბლოკება და საჭიროების შემთხვევაში ეცნობება შესაბამის ორგანოებს.',
        ],
      },
      {
        heading: 'შენი შიგთავსი და მოდერაცია',
        paragraphs: [
          'შენ ინარჩუნებ უფლებებს შენს ფოტოებსა და ტექსტზე. ჩვენ გვაძლევ მხოლოდ იმ უფლებას, რაც საჭიროა სერვისის მუშაობისთვის — შენი შიგთავსის შენახვისა და სხვა მომხმარებლებისთვის ჩვენებისთვის იმ ხილვადობის ფარგლებში, რომელსაც თავად აირჩევ.',
          'ფოტოები გადის მოდერაციას გამოქვეყნებამდე. ჩვენ ვიტოვებთ უფლებას, წავშალოთ შიგთავსი, რომელიც არღვევს ამ წესებს.',
          'საჩივრებს განვიხილავთ და ვრეაგირებთ 24 საათის განმავლობაში.',
        ],
      },
      {
        heading: 'საჩივარი და დაბლოკვა',
        paragraphs: [
          'ყველა პროფილიდან შეგიძლია მომხმარებლის დაბლოკვა და საჩივრის გაგზავნა. დაბლოკვა ორმხრივია — დაბლოკილი მომხმარებელი ვეღარ დაგინახავს და ვეღარ მოგწერს.',
        ],
      },
      {
        heading: 'უსაფრთხოება შეხვედრისას',
        paragraphs: [
          'ჩვენ არ ვამოწმებთ მომხმარებლების ვინაობას და არ ვატარებთ ნასამართლობის შემოწმებას. შეხვედრისას იყავი ფრთხილად: აირჩიე საჯარო ადგილი, აცნობე ახლობელს სად მიდიხარ და ენდე საკუთარ ინტუიციას.',
        ],
      },
      {
        heading: 'ანგარიშის შეჩერება და შეწყვეტა',
        paragraphs: [
          'ამ წესების დარღვევისას შეგვიძლია შევაჩეროთ ან წავშალოთ ანგარიში. მძიმე დარღვევისას — დაუყოვნებლივ და გაფრთხილების გარეშე.',
        ],
      },
      {
        heading: 'ანგარიშის წაშლა',
        paragraphs: [
          'ანგარიშის წაშლა ნებისმიერ დროს შეგიძლია პარამეტრებიდან, აპლიკაციის დატოვების გარეშე. დეტალები იმის შესახებ, თუ რა იშლება და რა რჩება, აღწერილია კონფიდენციალურობის პოლიტიკაში.',
        ],
      },
      {
        heading: 'პასუხისმგებლობის შეზღუდვა',
        paragraphs: [
          'სერვისი მოწოდებულია არსებული სახით. არ ვიძლევით გარანტიას, რომ იპოვი პარტნიორს ან რომ სხვა მომხმარებლები იქნებიან გულწრფელები. კანონით დაშვებულ ფარგლებში, არ ვაგებთ პასუხს მომხმარებლებს შორის ურთიერთობიდან წარმოშობილ ზიანზე.',
          'ეს შეზღუდვა არ ვრცელდება იმ პასუხისმგებლობაზე, რომლის გამორიცხვაც კანონით აკრძალულია.',
        ],
      },
      {
        heading: 'მოქმედი სამართალი',
        paragraphs: [
          'ამ პირობებზე ვრცელდება საქართველოს კანონმდებლობა. დავები განიხილება საქართველოს სასამართლოებში.',
        ],
      },
      {
        heading: 'ცვლილებები',
        paragraphs: [
          'პირობების არსებითი ცვლილების შემთხვევაში შეგატყობინებთ აპლიკაციაში. განახლებული ვერსიის ძალაში შესვლის შემდეგ სერვისით სარგებლობა ნიშნავს თანხმობას.',
        ],
      },
      {
        heading: 'კონტაქტი',
        paragraphs: [`${EMAIL}`],
      },
    ],
  };
}

function termsEn(app: string): LegalDoc {
  return {
    title: 'Terms of Service',
    updated: LEGAL_UPDATED,
    lead: `By using ${app} you agree to the terms below. If you do not agree, please do not use the app.`,
    sections: [
      {
        heading: 'Who we are',
        paragraphs: [
          `${app} is operated by ${ENTITY} (${ADDRESS}). You can reach us at ${EMAIL}.`,
        ],
      },
      {
        heading: 'Age requirement',
        paragraphs: [
          'This service is for people aged 18 and over only. By registering you confirm that you are at least 18.',
          'If we learn that a user is under 18, the account is deleted immediately.',
        ],
      },
      {
        heading: 'Your account',
        bullets: [
          'You are responsible for keeping your password secure.',
          'One person may hold only one account.',
          'Do not share your account or act on behalf of someone else.',
          'Information on your profile must be about you and must be accurate.',
        ],
      },
      {
        heading: 'Rules of conduct — zero tolerance',
        paragraphs: [
          'There is no tolerance for objectionable content or abusive users. Breaking these rules results in your account being removed, without warning where the breach is serious.',
        ],
        bullets: [
          'Using someone else photos or identity.',
          'Harassment, threats, hate speech or discrimination, including on the basis of sexual orientation or gender identity.',
          'Any depiction of a minor.',
          'Sharing another person private information without their consent.',
          'Spam, scams, financial fraud or phishing.',
          'Violent or unlawful content.',
          'Genitalia or sexual acts in profile photos.',
        ],
      },
      {
        heading: 'No commercial sexual services',
        paragraphs: [
          'This platform is for personal dating. Offering, requesting or advertising sexual services in exchange for payment is prohibited, as is promoting escort services of any kind.',
          'Accounts doing so are removed and, where appropriate, reported to the relevant authorities.',
        ],
      },
      {
        heading: 'Your content and moderation',
        paragraphs: [
          'You keep the rights to your photos and text. You grant us only what is needed to run the service: storing your content and showing it to other users within the visibility you choose.',
          'Photos are moderated before they are published. We may remove content that breaks these rules.',
          'We review reports and respond within 24 hours.',
        ],
      },
      {
        heading: 'Reporting and blocking',
        paragraphs: [
          'Every profile has a report and a block control. Blocking works both ways: a blocked user can no longer see you or message you.',
        ],
      },
      {
        heading: 'Safety when meeting people',
        paragraphs: [
          'We do not verify identities and we do not run background checks. Take care when meeting someone: choose a public place, tell someone you trust where you are going, and trust your instincts.',
        ],
      },
      {
        heading: 'Suspension and termination',
        paragraphs: [
          'We may suspend or delete an account that breaks these terms, immediately and without notice where the breach is serious.',
        ],
      },
      {
        heading: 'Deleting your account',
        paragraphs: [
          'You can delete your account at any time from Settings, without leaving the app. What is deleted and what is retained is set out in the Privacy Policy.',
        ],
      },
      {
        heading: 'Disclaimers and liability',
        paragraphs: [
          'The service is provided as is. We do not promise that you will meet anyone, or that other users are honest about themselves. To the extent permitted by law, we are not liable for harm arising from interactions between users.',
          'Nothing here limits liability that cannot be limited by law.',
        ],
      },
      {
        heading: 'Governing law',
        paragraphs: [
          'These terms are governed by the law of Georgia, and disputes are heard by the courts of Georgia.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'We will tell you in the app if these terms change materially. Continuing to use the service after the change takes effect means you accept it.',
        ],
      },
      { heading: 'Contact', paragraphs: [`${EMAIL}`] },
    ],
  };
}

/* ========================================================================= */
/* PRIVACY                                                                    */
/* ========================================================================= */

function privacyKa(app: string): LegalDoc {
  return {
    title: 'კონფიდენციალურობის პოლიტიკა',
    updated: LEGAL_UPDATED,
    lead: `ეს დოკუმენტი აღწერს, რა მონაცემებს ვაგროვებთ ${app}-ში, რატომ და რა უფლებები გაქვს.`,
    sections: [
      {
        heading: 'მონაცემთა კონტროლერი',
        paragraphs: [
          `${ENTITY}, ${ADDRESS}. კონფიდენციალურობასთან დაკავშირებული ნებისმიერი საკითხისთვის: ${EMAIL}.`,
        ],
      },
      {
        heading: 'რა მონაცემებს ვაგროვებთ',
        bullets: [
          'ანგარიში: ელფოსტა, მომხმარებლის სახელი, პაროლის ჰეში (არასდროს თავად პაროლი), რეგისტრაციის თარიღი.',
          'პროფილი: სახელი, ასაკი, სქესი, სიმაღლე და სხვა არჩევითი მახასიათებლები, რომლებსაც თავად ავსებ.',
          'ფოტოები, მათ შორის კერძო ალბომის ფოტოები.',
          'მიახლოებითი მდებარეობა: ვინახავთ დაახლოებით დაჯგუფებულ უჯრედს და არა ზუსტ კოორდინატებს.',
          'შეტყობინებები სხვა მომხმარებლებთან.',
          'აქტივობა: მოწონებები, გამოტოვებები, პროფილის ნახვები, ბოლო აქტივობის დრო.',
          'ტექნიკური მონაცემები: IP-მისამართი, ბრაუზერის ტიპი, სესიის ჟურნალები — უსაფრთხოებისა და ბოროტად გამოყენების აღსაკვეთად.',
        ],
      },
      {
        heading: 'განსაკუთრებული კატეგორიის მონაცემები',
        paragraphs: [
          'სექსუალური ორიენტაციისა და გენდერული იდენტობის შესახებ ინფორმაცია განსაკუთრებული კატეგორიის მონაცემია. მას ვამუშავებთ მხოლოდ შენი თანხმობით და მხოლოდ იმისთვის, რომ სერვისმა იმუშაოს — ანუ გაჩვენოს რელევანტური პროფილები.',
          'ამ ველების შევსება არჩევითია და ნებისმიერ დროს შეგიძლია წაშალო პროფილის რედაქტორიდან. თანხმობის გატანა ნიშნავს ამ ველების გასუფთავებას.',
        ],
      },
      {
        heading: 'რატომ ვამუშავებთ',
        bullets: [
          'ანგარიშის შექმნა და სერვისის მიწოდება — ხელშეკრულების შესრულება.',
          'უსაფრთხოება, მოდერაცია, თაღლითობის აღკვეთა — ლეგიტიმური ინტერესი.',
          'განსაკუთრებული კატეგორიის მონაცემები და მდებარეობა — შენი თანხმობა.',
          'კანონისმიერი ვალდებულებების შესრულება.',
        ],
      },
      {
        heading: 'ვინ ხედავს შენს მონაცემებს',
        paragraphs: [
          'შენი პროფილი ჩანს იმ ფარგლებში, რომელსაც თავად აირჩევ ხილვადობის პარამეტრებში. კერძო ალბომის ფოტოები ჩანს მხოლოდ იმ ადამიანებისთვის, ვისაც წვდომას თავად მიანიჭებ.',
          'შეტყობინებები ხილვადია მხოლოდ შენთვის და ადრესატისთვის. მოდერატორს შეუძლია ნახოს კონკრეტული მიმოწერა მხოლოდ მაშინ, როცა მასზე საჩივარია შემოსული.',
          'არასდროს ვყიდით პერსონალურ მონაცემებს და არ ვიყენებთ სარეკლამო ქსელებს.',
        ],
      },
      {
        heading: 'ვის ვუზიარებთ',
        bullets: [
          'ჰოსტინგი: სერვერები განთავსებულია გერმანიაში (Hetzner).',
          'ფაილების შენახვა: Cloudflare R2 ან ჩვენივე სერვერი.',
          'ტრანზაქციული ელფოსტის მიმწოდებელი — მხოლოდ სერვისული წერილებისთვის.',
          'სამართალდამცავი ორგანოები — მხოლოდ კანონიერი მოთხოვნის საფუძველზე.',
        ],
      },
      {
        heading: 'შენახვის ვადა',
        paragraphs: [
          'მონაცემებს ვინახავთ მანამ, სანამ ანგარიში აქტიურია. ანგარიშის წაშლის შემდეგ პროფილი, ფოტოები, მოწონებები და ნახვები იშლება.',
          'უსაფრთხოების ჟურნალები და დაბლოკვის ჩანაწერები შეიძლება შევინახოთ შეზღუდული ვადით, რათა დაბლოკილმა მომხმარებელმა ახალი ანგარიშით არ დაუბრუნდეს იმავე ადამიანს.',
        ],
      },
      {
        heading: 'ანგარიშის წაშლა',
        paragraphs: [
          'წაშლა ხელმისაწვდომია აპლიკაციაში, პარამეტრებში. წაშლის დადასტურების შემდეგ ანგარიში დაუყოვნებლივ წყვეტს ხილვადობას და მონაცემები იშლება.',
        ],
      },
      {
        heading: 'შენი უფლებები',
        bullets: [
          'წვდომა შენს მონაცემებზე და მათი ასლის მიღება.',
          'არასწორი მონაცემის შესწორება.',
          'წაშლა.',
          'დამუშავების შეზღუდვა ან მასზე უარის თქმა.',
          'თანხმობის გატანა ნებისმიერ დროს.',
          'საჩივრის შეტანა პერსონალურ მონაცემთა დაცვის სამსახურში.',
        ],
      },
      {
        heading: 'უსაფრთხოება',
        paragraphs: [
          'კავშირი დაშიფრულია (HTTPS). პაროლები ინახება მხოლოდ ჰეშირებული სახით. კერძო ფოტოები მიეწოდება ხანმოკლე, ხელმოწერილი ბმულებით.',
        ],
      },
      {
        heading: 'ბავშვები',
        paragraphs: [
          'სერვისი არ არის განკუთვნილი 18 წლამდე პირებისთვის და შეგნებულად არ ვაგროვებთ მათ მონაცემებს.',
        ],
      },
      {
        heading: 'ქუქი-ფაილები',
        paragraphs: [
          'ვიყენებთ მხოლოდ აუცილებელ ქუქი-ფაილებს: სესია და ენის არჩევანი. სარეკლამო ან მესამე მხარის ანალიტიკური ქუქები არ გვაქვს.',
        ],
      },
      {
        heading: 'ცვლილებები',
        paragraphs: ['არსებითი ცვლილების შესახებ შეგატყობინებთ აპლიკაციაში.'],
      },
      { heading: 'კონტაქტი', paragraphs: [`${EMAIL}`] },
    ],
  };
}

function privacyEn(app: string): LegalDoc {
  return {
    title: 'Privacy Policy',
    updated: LEGAL_UPDATED,
    lead: `This explains what ${app} collects, why, and what rights you have.`,
    sections: [
      {
        heading: 'Data controller',
        paragraphs: [`${ENTITY}, ${ADDRESS}. For anything privacy related: ${EMAIL}.`],
      },
      {
        heading: 'What we collect',
        bullets: [
          'Account: email, username, a hash of your password (never the password), signup date.',
          'Profile: name, age, gender, height and the other optional attributes you choose to fill in.',
          'Photos, including private album photos.',
          'Approximate location: we store a coarse bucketed cell, not exact coordinates.',
          'Messages with other users.',
          'Activity: likes, passes, profile views, last-active time.',
          'Technical data: IP address, browser type, session logs — for security and abuse prevention.',
        ],
      },
      {
        heading: 'Special category data',
        paragraphs: [
          'Information about sexual orientation and gender identity is special category data. We process it only with your consent and only to make the service work, which means showing you relevant profiles.',
          'These fields are optional and you can clear them at any time in the profile editor. Withdrawing consent means clearing those fields.',
        ],
      },
      {
        heading: 'Why we process it',
        bullets: [
          'To create your account and provide the service — performance of a contract.',
          'Safety, moderation and fraud prevention — legitimate interest.',
          'Special category data and location — your consent.',
          'Meeting legal obligations.',
        ],
      },
      {
        heading: 'Who can see your data',
        paragraphs: [
          'Your profile is visible within the limits you set in your visibility settings. Private album photos are visible only to people you grant access to.',
          'Messages are visible to you and the person you are writing to. A moderator can see a specific conversation only when it has been reported.',
          'We never sell personal data and we use no advertising networks.',
        ],
      },
      {
        heading: 'Who we share with',
        bullets: [
          'Hosting: servers located in Germany (Hetzner).',
          'File storage: Cloudflare R2, or our own server.',
          'A transactional email provider, for service emails only.',
          'Law enforcement, only on a lawful request.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'We keep your data while your account is active. After deletion, your profile, photos, likes and views are removed.',
          'Security logs and block records may be kept for a limited period so that a removed user cannot return to the same person under a new account.',
        ],
      },
      {
        heading: 'Deleting your account',
        paragraphs: [
          'Deletion is available in the app, under Settings. Once confirmed, the account stops being visible immediately and the data is removed.',
        ],
      },
      {
        heading: 'Your rights',
        bullets: [
          'Access your data and get a copy.',
          'Correct inaccurate data.',
          'Erasure.',
          'Restrict or object to processing.',
          'Withdraw consent at any time.',
          'Complain to the Personal Data Protection Service of Georgia.',
        ],
      },
      {
        heading: 'Security',
        paragraphs: [
          'Traffic is encrypted over HTTPS. Passwords are stored only as hashes. Private photos are served through short-lived signed links.',
        ],
      },
      {
        heading: 'Children',
        paragraphs: [
          'This service is not for anyone under 18 and we do not knowingly collect their data.',
        ],
      },
      {
        heading: 'Cookies',
        paragraphs: [
          'We use only essential cookies: your session and your language choice. There are no advertising or third-party analytics cookies.',
        ],
      },
      { heading: 'Changes', paragraphs: ['We will tell you in the app if this changes materially.'] },
      { heading: 'Contact', paragraphs: [`${EMAIL}`] },
    ],
  };
}

export function getTerms(locale: Locale, appName: string): LegalDoc {
  return locale === 'en' ? termsEn(appName) : termsKa(appName);
}

export function getPrivacy(locale: Locale, appName: string): LegalDoc {
  return locale === 'en' ? privacyEn(appName) : privacyKa(appName);
}
