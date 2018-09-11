Summary: F5 Declarative Onboarding iControlLX extension
Name: f5-decon
Version: 0.1.0
Release: %{_release}
BuildArch: noarch
Group: Development/Tools
License: Commercial
Packager: F5 Networks <support@f5.com>

%description
Declarative onboarding for BIG-IP

%define _rpmfilename %%{ARCH}/%%{NAME}-%%{VERSION}-%%{RELEASE}.%%{ARCH}.rpm
%define IAPP_INSTALL_DIR /var/config/rest/iapps/%{name}

%prep
npm install --production
mkdir -p %{_builddir}/src
mkdir -p %{_builddir}/node_modules
cp -r %{main}/src %{_builddir}/src
cp -r %{main}/node_modules %{_builddir}/node_modules
echo -n %{version}-%{release} > %{_builddir}/src/version

%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
cp -r %{_builddir}/src/* $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
cp -r %{_builddir}

%clean
rm -rf $RPM_BUILD_ROOT

%files
%defattr(-,root,root)
%{IAPP_INSTALL_DIR}
