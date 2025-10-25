// privacy.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyScreen() {
  const router = useRouter();

  const handleEmailPress = () => {
    Linking.openURL('mailto:info@safecircle.africa');
  };

  const handlePhonePress = () => {
    Linking.openURL('tel:+260972257052');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#EF4444" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        <Text style={styles.lastUpdated}>Last Updated: Sep 15, 2024</Text>
        
        <Text style={styles.paragraph}>
          SafeCircle has created this privacy policy in order to demonstrate our firm commitment to your privacy. 
          The following discloses our information gathering and dissemination practices relating to the SafeCircle 
          Web Application ("the App"), the delivery of our services and other interactions with you. Please note 
          that when you access any external links from the App, such external websites may have different privacy 
          policies from the sites and SafeCircle is not responsible for the privacy practices of such external links.
        </Text>

        <Text style={styles.sectionTitle}>1. Interpretation</Text>
        
        <Text style={styles.boldText}>Biometric Data</Text>
        <Text style={styles.paragraph}>
          means personal data resulting from specific technical processing relating to the physical, physiological 
          or behavioural characteristics of a natural person, which allow or confirm the unique identification of 
          that natural person, such as facial images or dactyloscopic (finger print) data.
        </Text>

        <Text style={styles.boldText}>Consent</Text>
        <Text style={styles.paragraph}>
          of the data subject means any freely given, specific, informed and unambiguous indication of the data 
          subject's wishes by which he or she, by a statement or by a clear affirmative action, signifies agreement 
          to the processing of personal data relating to him or her.
        </Text>

        <Text style={styles.boldText}>Data</Text>
        <Text style={styles.paragraph}>
          means individual facts, statistics, or items of information regarding an individual. Data can refer to 
          automated data and manual data.
        </Text>

        <Text style={styles.boldText}>Data Subject</Text>
        <Text style={styles.paragraph}>
          means an identified or identifiable natural person (see Personal Data).
        </Text>

        <Text style={styles.boldText}>Data Protection Officer (DPO)</Text>
        <Text style={styles.paragraph}>
          the person required to be appointed in specific circumstances under the regulations. The DPO oversees 
          how we collect, use, share and protect information.
        </Text>

        <Text style={styles.boldText}>Explicit Consent</Text>
        <Text style={styles.paragraph}>
          means consent which requires a very clear and specific statement on the part of the Data Subject.
        </Text>

        <Text style={styles.boldText}>Personal Data</Text>
        <Text style={styles.paragraph}>
          means any information relating to an identified or identifiable natural person ('data subject'); an 
          identifiable natural person is one who can be identified, directly or indirectly, in particular by 
          reference to an identifier such as a name, an identification number, location data, an online identifier 
          or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural 
          or social identity of that natural person.
        </Text>

        <Text style={styles.boldText}>Processing or Process</Text>
        <Text style={styles.paragraph}>
          means any operation or set of operations which is performed on personal data or on sets of personal data, 
          whether or not by automated means, such as collection, recording, organisation, structuring, storage, 
          adaptation or alteration, retrieval, consultation, use, disclosure by transmission, dissemination or 
          otherwise making available, alignment or combination, restriction, erasure or destruction.
        </Text>

        <Text style={styles.boldText}>Records</Text>
        <Text style={styles.paragraph}>
          documents in every format created and received by individuals or organisations in the course of conduct 
          of affairs and accumulated as evidence of these activities.
        </Text>

        <Text style={styles.boldText}>Supervisory Authority</Text>
        <Text style={styles.paragraph}>
          means an independent public authority which is established under the Data Protection Act, that is, the 
          Zambia Data Protection Authority.
        </Text>

        <Text style={styles.boldText}>SafeCircle</Text>
        <Text style={styles.paragraph}>
          means SafeCircle Financial Solutions Limited, a company duly incorporated under the laws of Zambia, whose 
          registered address is at Plot 92, Sub 10 off 916, Lusaka South, Zambia.
        </Text>

        <Text style={styles.boldText}>SafeCircle Web App or Our App or the App</Text>
        <Text style={styles.paragraph}>
          means the SafeCircle Web Application.
        </Text>

        <Text style={styles.sectionTitle}>2. Data Collection</Text>
        <Text style={styles.paragraph}>
          SafeCircle may collect Personal Information which information alone or in combination with other information 
          may be used to identify you. This could be your name, your address, your mobile number, email address, home 
          or business address or any other location from which you use our services.
        </Text>

        <Text style={styles.sectionTitle}>3. Device Information</Text>
        <Text style={styles.paragraph}>
          When you are connected to the App, we may collect device-specific information such as your device model, 
          operating system, unique device identifiers, and mobile network information.
        </Text>
        <Text style={styles.paragraph}>
          Server logs that are maintained by us or by our third-party service providers may contain information about 
          the services that you have used, and your device-specific information. We may use your device's IP address 
          or MAC address to track device-event information such as crashes, system activity, hardware settings, browser 
          type, browser language, the date and time of your request and referral URL.
        </Text>
        <Text style={styles.paragraph}>
          When you visit, use and interact with the Application, we may receive certain information about your visit, 
          use or interactions. For example, we may monitor the number of people that have visited the Application.
        </Text>
        <Text style={styles.paragraph}>
          In particular, the following information is created and automatically logged in our systems:
        </Text>

        <Text style={styles.boldText}>Log Data:</Text>
        <Text style={styles.paragraph}>
          Information that your browser automatically sends whenever you visit the App. This includes your Internet 
          Protocols address, browser type and settings, the date and time of your request and how you interacted with 
          the Application.
        </Text>

        <Text style={styles.boldText}>Usage Information:</Text>
        <Text style={styles.paragraph}>
          We collect information about how you use our App, such as the actions you take, and the time, frequency and 
          duration of your activities.
        </Text>

        <Text style={styles.sectionTitle}>4. How the Data is collected?</Text>
        <Text style={styles.paragraph}>
          We collect your Personal Information in connection with the services provided to you. We also may use any 
          number of tools to collect information about you, your computer access points, and mobile devices that you 
          use to connect to the App.
        </Text>
        <Text style={styles.paragraph}>
          SafeCircle may collect additional information from the App each time you visit the App.
        </Text>

        <Text style={styles.boldText}>Use of your Personal Information</Text>
        <Text style={styles.paragraph}>
          • SafeCircle may use your Personal Information to contact you via email, telephone or mobile device in order 
          to give you updates about SafeCircle's special events, new services, payment confirmations or other promotions 
          that may be of interest to you.
        </Text>
        <Text style={styles.paragraph}>
          • We also use return e-mail addresses to answer the e-mail we receive from you. We may also use your IP address, 
          or unique devices identification numbers to help protect SafeCircle and our internet service providers from fraud.
        </Text>
        <Text style={styles.paragraph}>
          • Additional uses of your non-personal and Personal Information will allow us to tailor products and services 
          specific to your needs, to help organise and manage our relationship with you to enforce the App's Terms of Use.
        </Text>
        <Text style={styles.paragraph}>
          • We may also use non-personal aggregate information to improve our products and services offerings. Such 
          information may also be used to analyse the effectiveness of our services.
        </Text>

        <Text style={styles.sectionTitle}>5. Consent</Text>
        <Text style={styles.paragraph}>
          If we use your sensitive Personal Information, such as biometric data, we will ask for your explicit consent.
        </Text>
        <Text style={styles.paragraph}>
          We will ensure that you are informed when making your decision and that you are aware that you can remove your 
          consent at any time by contacting us.
        </Text>
        <Text style={styles.paragraph}>
          We ensure your consent is obtained under the following principles: Positive Action (Clear affirmative action by 
          you is required), free will, specific, recorded and can be withdrawn at any time.
        </Text>

        <Text style={styles.sectionTitle}>6. Data Protection Officer</Text>
        <Text style={styles.paragraph}>
          To ensure that your rights are protected, our Data Protection Officer oversees the collection, use, sharing and 
          protection of your information. The Data Protection Officer may be contacted by email at{' '}
          <Text style={styles.link} onPress={handleEmailPress}>info@safecircle.africa</Text>{' '}
          by telephone on{' '}
          <Text style={styles.link} onPress={handlePhonePress}>+260 972 257 052</Text>{' '}
          or by writing to The Data Protection Officer, at Plot 16546/1080, Off Nationalist Road, Kamwala South, Lusaka, Zambia.
        </Text>

        <Text style={styles.sectionTitle}>7. Keeping your information safe and secure</Text>
        <Text style={styles.paragraph}>
          We protect your information with security measures under the laws that apply. The collection, use, sharing, 
          protection and deletion of your information is overseen by our Data Protection Officer.
        </Text>
        <Text style={styles.paragraph}>
          When you contact us to ask about your information, we may ask you to identify yourself. This is to help us 
          protect your information.
        </Text>
        <Text style={styles.paragraph}>
          To meet our legal and regulatory obligations, we hold your information while you hold an account with us and 
          for a period of time after that subject to legal, regulatory and business requirements, which may require us 
          to hold the information for a longer period.
        </Text>
        <Text style={styles.paragraph}>
          We continuously assess and delete data to ensure it is not held for longer than necessary.
        </Text>

        <Text style={styles.sectionTitle}>8. Sharing your information with third parties</Text>
        <Text style={styles.paragraph}>
          We may share your information with third parties sometimes, in order to: provide services, analyse information, 
          research your experiences dealing with us and to protect both our interests.
        </Text>
        <Text style={styles.paragraph}>
          The information is only shared upon assurance that the third party has a functional data protection policy in 
          place and where the same is required by law.
        </Text>

        <Text style={styles.sectionTitle}>9. Your rights regarding your Personal Information</Text>
        <Text style={styles.paragraph}>
          If you wish to exercise your Personal Information rights, please contact the Data Protection Officer by email at{' '}
          <Text style={styles.link} onPress={handleEmailPress}>info@safecircle.africa</Text>, by telephone on{' '}
          <Text style={styles.link} onPress={handlePhonePress}>+260 972 257 052</Text>{' '}
          or by writing to The Data Protection Officer, Plot 16546/1080, Off Nationalist Road, Kamwala South, Lusaka, Zambia.
        </Text>
        <Text style={styles.paragraph}>
          When you contact us to ask about your information, we may ask you to identify yourself, this is to help us 
          protect your information.
        </Text>
        <Text style={styles.paragraph}>
          You have the right to obtain information, however this right cannot affect the rights and freedoms of others. 
          We cannot therefore provide information on or about other people without their consent.
        </Text>
        <Text style={styles.paragraph}>
          We will provide your information without charge. As permitted under the law, where information requests are 
          manifestly unfounded or excessive, we may either charge a reasonable fee or refuse to act on the request.
        </Text>

        <Text style={styles.sectionTitle}>10. Access to your Personal Information</Text>
        <Text style={styles.paragraph}>You can request for the following information:</Text>
        <Text style={styles.paragraph}>• the information we hold on you;</Text>
        <Text style={styles.paragraph}>• the purposes of the processing;</Text>
        <Text style={styles.paragraph}>• the categories of personal data concerned;</Text>
        <Text style={styles.paragraph}>• the recipients or categories of recipient to whom the personal data have been or will be disclosed;</Text>
        <Text style={styles.paragraph}>• where the personal data are not collected from you, any available information as to their source;</Text>
        <Text style={styles.paragraph}>• the significance and the envisaged consequences of such processing for you.</Text>

        <Text style={styles.sectionTitle}>11. Updating your Personal Information</Text>
        <Text style={styles.paragraph}>
          You may update or correct any of your personal details. Please contact us at{' '}
          <Text style={styles.link} onPress={handlePhonePress}>+260 972 257 052</Text>{' '}
          or call to any of our offices.
        </Text>

        <Text style={styles.sectionTitle}>12. Withdrawing your consent</Text>
        <Text style={styles.paragraph}>
          If you have given us consent in relation to the use of your Personal Information, you can change your mind and 
          withdraw your consent. Please contact us at{' '}
          <Text style={styles.link} onPress={handlePhonePress}>+260 972 257 052</Text>{' '}
          or call to any of our offices.
        </Text>

        <Text style={styles.sectionTitle}>13. Restricting and objecting to processing your Personal Information</Text>
        <Text style={styles.paragraph}>
          You have the right to restrict or object to us processing your Personal Information. We will require your consent 
          to further process this information once restricted.
        </Text>

        <Text style={styles.sectionTitle}>14. Deleting your Personal Information (your right to be forgotten)</Text>
        <Text style={styles.paragraph}>You may ask us to delete your Personal Information or we may delete your Personal Information if:</Text>
        <Text style={styles.paragraph}>• the personal data are no longer necessary in relation to the purposes for which they were collected or processed;</Text>
        <Text style={styles.paragraph}>• you withdraw your consent for whichever reasons;</Text>
        <Text style={styles.paragraph}>• the personal data have been unlawfully processed;</Text>
        <Text style={styles.paragraph}>• the personal data have to be erased for compliance with a legal obligation.</Text>

        <Text style={styles.sectionTitle}>15. Moving your Personal Information (your right to data portability)</Text>
        <Text style={styles.paragraph}>
          If you request and where possible we can share a digital copy of your information directly with you or another 
          organisation.
        </Text>
        <Text style={styles.paragraph}>
          We do not share information processed under legal obligation or our legitimate interest for portability, this is 
          in line with the laws of Data Protection.
        </Text>

        <Text style={styles.sectionTitle}>16. Right to lodge a complaint with a 'Supervisory Authority'</Text>
        <Text style={styles.paragraph}>
          If you have a complaint about your Personal Information, please contact us on{' '}
          <Text style={styles.link} onPress={handlePhonePress}>+260 972 257 052</Text>{' '}
          or contact a member of staff in any of our offices.
        </Text>
        <Text style={styles.paragraph}>
          You may also make a complaint to the Data Protection Officer, by email at{' '}
          <Text style={styles.link} onPress={handleEmailPress}>info@safecircle.africa</Text>, by telephone on{' '}
          <Text style={styles.link} onPress={handlePhonePress}>+260 972 257 052</Text>{' '}
          or by writing to The Data Protection Officer, Plot 16546/1080, Off Nationalist Road, Kamwala South, Zambia.
        </Text>
        <Text style={styles.paragraph}>
          Any complaint you make to us will be investigated as fully as possible. Please provide as much information as 
          possible to help us quickly resolve your complaint.
        </Text>

        <Text style={styles.sectionTitle}>17. Updates to this Privacy Policy</Text>
        <Text style={styles.paragraph}>
          From time to time we will update this policy if we change how we use your information, change our technology or 
          change our products. The most up to date notice will always be on our web-site privacy policy.
        </Text>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 24,
    marginBottom: 12,
  },
  boldText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginTop: 12,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 24,
    marginBottom: 12,
  },
  link: {
    color: '#EF4444',
    textDecorationLine: 'underline',
  },
  lastUpdated: {
    fontSize: 13,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  spacer: {
    height: 40,
  },
});